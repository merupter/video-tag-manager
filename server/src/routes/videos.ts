import { Router, type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import db from '../db';
import { upload, UPLOAD_DIR, THUMBNAIL_DIR } from '../middleware/upload';
import { success, fail } from '../utils/response';
import { getVideoDuration, generateThumbnail } from '../services/ffmpeg';

const router = Router();

/**
 * 把数据库里存的相对路径（形如 'uploads/xxx.mp4' 或 'uploads/thumbnails/xxx.jpg'）
 * 解析成基于当前 UPLOAD_DIR 的绝对路径，兼容本地与生产部署。
 */
function toAbsPath(relPath: string): string {
  const rel = relPath.replace(/^uploads[/\\]/, '');
  return path.resolve(UPLOAD_DIR, rel);
}

/**
 * 上传视频
 * POST /api/videos
 * Content-Type: multipart/form-data
 * 字段名：video
 *
 * 流程：multer 落盘 -> ffmpeg 取时长 -> ffmpeg 截第1秒缩略图 -> 写库 -> 返回
 */
router.post('/', upload.single('video'), async (req: Request, res: Response) => {
  if (!req.file) {
    fail(res, '请上传视频文件（字段名 video）');
    return;
  }

  const originalName = req.file.originalname;
  const storedName = req.file.filename;
  const relFilePath = path.join('uploads', storedName).replace(/\\/g, '/');
  const absFilePath = req.file.path;

  try {
    // 1. 获取视频时长
    const duration = await getVideoDuration(absFilePath);

    // 2. 生成缩略图（第 1 秒）
    const thumbName = `${path.parse(storedName).name}.jpg`;
    const relThumbPath = path.join('uploads', 'thumbnails', thumbName).replace(/\\/g, '/');
    const absThumbPath = path.join(THUMBNAIL_DIR, thumbName);

    let thumbnailPath: string | null = null;
    try {
      await generateThumbnail(absFilePath, absThumbPath, 1);
      if (fs.existsSync(absThumbPath)) {
        thumbnailPath = relThumbPath;
      }
    } catch {
      // 缩略图生成失败不阻断上传，thumbnail_path 留空
      thumbnailPath = null;
    }

    // 3. 写入数据库
    const result = db
      .prepare(
        `INSERT INTO videos (filename, filepath, thumbnail_path, duration)
         VALUES (?, ?, ?, ?)`,
      )
      .run(originalName, relFilePath, thumbnailPath, duration);

    // 4. 返回视频 id 和文件路径
    success(
      res,
      {
        id: Number(result.lastInsertRowid),
        filepath: relFilePath,
        thumbnail_path: thumbnailPath,
        duration,
        filename: originalName,
      },
      201,
    );
  } catch (err) {
    // 异常时清理已上传的视频文件，避免脏数据
    if (fs.existsSync(absFilePath)) {
      fs.unlinkSync(absFilePath);
    }
    throw err;
  }
});

/**
 * 获取视频列表
 * GET /api/videos?tag=xxx&search=xxx
 * - tag: 按标签名筛选
 * - search: 按文件名模糊搜索
 *
 * 返回每个视频的 tags 数组
 */
router.get('/', (req: Request, res: Response) => {
  const tag = typeof req.query.tag === 'string' ? req.query.tag.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  // 基础查询：用 json_group_array 聚合标签对象，避免 N+1
  let sql = `
    SELECT
      v.id, v.filename, v.filepath, v.thumbnail_path, v.duration, v.created_at,
      COALESCE(
        json_group_array(json_object('id', t.id, 'name', t.name))
          FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) AS tags
    FROM videos v
    LEFT JOIN video_tags vt ON vt.video_id = v.id
    LEFT JOIN tags t ON t.id = vt.tag_id
  `;
  const params: (string | number)[] = [];
  const conditions: string[] = [];

  // 标签筛选：需要用子查询，因为主查询用了 LEFT JOIN 聚合
  if (tag) {
    conditions.push(`v.id IN (
      SELECT vt2.video_id FROM video_tags vt2
      INNER JOIN tags t2 ON t2.id = vt2.tag_id
      WHERE t2.name = ?
    )`);
    params.push(tag);
  }

  // 文件名模糊搜索
  if (search) {
    conditions.push('v.filename LIKE ?');
    params.push(`%${search}%`);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  sql += ' GROUP BY v.id ORDER BY v.created_at DESC';

  const rows = db.prepare(sql).all(...params) as Array<{
    id: number;
    filename: string;
    filepath: string;
    thumbnail_path: string | null;
    duration: number;
    created_at: string;
    tags: string; // JSON 字符串
  }>;

  // 解析 JSON 标签数组
  const videos = rows.map((row) => ({
    ...row,
    tags: row.tags ? JSON.parse(row.tags) : [],
  }));

  success(res, videos);
});

/**
 * 删除视频
 * DELETE /api/videos/:id
 * 同时删除视频文件、缩略图文件和 video_tags 关联
 */
router.delete('/:id', (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id || Number.isNaN(id)) {
    fail(res, '无效的视频 ID');
    return;
  }

  const video = db
    .prepare('SELECT filepath, thumbnail_path FROM videos WHERE id = ?')
    .get(id) as { filepath: string; thumbnail_path: string | null } | undefined;

  if (!video) {
    fail(res, '视频不存在', 404);
    return;
  }

  // 删除数据库记录（外键级联会自动清理 video_tags）
  db.prepare('DELETE FROM videos WHERE id = ?').run(id);

  // 删除物理文件（基于 UPLOAD_DIR 解析绝对路径）
  if (video.filepath) {
    const absVideoPath = toAbsPath(video.filepath);
    if (fs.existsSync(absVideoPath)) {
      fs.unlinkSync(absVideoPath);
    }
  }
  if (video.thumbnail_path) {
    const absThumbPath = toAbsPath(video.thumbnail_path);
    if (fs.existsSync(absThumbPath)) {
      fs.unlinkSync(absThumbPath);
    }
  }

  success(res, { id });
});

/**
 * 给视频添加标签
 * POST /api/videos/:id/tags
 * Body: { name: string }
 * 标签不存在则自动创建，已存在则复用；避免重复关联
 */
router.post('/:id/tags', (req: Request, res: Response) => {
  const videoId = Number(req.params.id);
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';

  if (!videoId || Number.isNaN(videoId)) {
    fail(res, '无效的视频 ID');
    return;
  }
  if (!name) {
    fail(res, '标签名不能为空');
    return;
  }

  // 检查视频是否存在
  const video = db.prepare('SELECT id FROM videos WHERE id = ?').get(videoId);
  if (!video) {
    fail(res, '视频不存在', 404);
    return;
  }

  // 标签不存在则创建，存在则获取 id
  db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
  const tag = db.prepare('SELECT id, name FROM tags WHERE name = ?').get(name) as {
    id: number;
    name: string;
  };

  // 关联视频与标签（忽略重复）
  db.prepare('INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?)').run(
    videoId,
    tag.id,
  );

  success(res, tag, 201);
});

/**
 * 移除视频的某个标签
 * DELETE /api/videos/:id/tags/:tagId
 * 仅解除关联，不删除标签本身
 */
router.delete('/:id/tags/:tagId', (req: Request, res: Response) => {
  const videoId = Number(req.params.id);
  const tagId = Number(req.params.tagId);

  if (!videoId || !tagId || Number.isNaN(videoId) || Number.isNaN(tagId)) {
    fail(res, '无效的 ID');
    return;
  }

  db.prepare('DELETE FROM video_tags WHERE video_id = ? AND tag_id = ?').run(videoId, tagId);
  success(res, { videoId, tagId });
});

export default router;
