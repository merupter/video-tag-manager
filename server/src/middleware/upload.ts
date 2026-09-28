import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { AppError } from '../utils/response';

/**
 * 上传目录与缩略图目录
 * - 本地：server/uploads 与 server/uploads/thumbnails
 * - 生产：由 UPLOADS_DIR 指定（Railway volume 挂载点，如 /uploads）
 */
const UPLOAD_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '../../uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// 启动时确保目录存在
[UPLOAD_DIR, THUMBNAIL_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 允许的视频格式（扩展名）
const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // 保留原始扩展名，加时间戳+随机数避免重名覆盖
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

/**
 * multer 单文件上传配置
 * - 字段名：video
 * - 最大 2GB
 * - 仅允许 mp4/mov/avi/mkv
 */
export const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2GB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      cb(new AppError(`不支持的文件格式，仅允许: ${ALLOWED_EXTENSIONS.join(', ')}`, 400));
      return;
    }
    cb(null, true);
  },
});

// 供路由层引用，用于解析视频/缩略图的绝对路径
export { UPLOAD_DIR, THUMBNAIL_DIR };
