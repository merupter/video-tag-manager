import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

/**
 * 数据库文件目录
 * - 本地开发：server/data
 * - 生产（Railway 等）：由 DATA_DIR 环境变量指定，通常为 volume 挂载点
 */
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../data');
const DB_PATH = path.join(DATA_DIR, 'video-tag.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// 开启外键约束（SQLite 默认关闭）
db.pragma('foreign_keys = ON');
// 开启 WAL 模式，提升并发读写性能
db.pragma('journal_mode = WAL');

/**
 * 初始化表结构
 * 使用 CREATE TABLE IF NOT EXISTS，启动时自动建表
 */
function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      filename        TEXT    NOT NULL,
      filepath        TEXT    NOT NULL,
      thumbnail_path  TEXT,
      duration        REAL,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT    NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS video_tags (
      video_id  INTEGER NOT NULL,
      tag_id    INTEGER NOT NULL,
      PRIMARY KEY (video_id, tag_id),
      FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id)   REFERENCES tags(id)   ON DELETE CASCADE
    );
  `);

  // 常用查询索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);
    CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id);
  `);
}

initSchema();

export default db;
