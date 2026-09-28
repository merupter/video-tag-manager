// 在最顶部加载 .env（本地开发用）；生产环境由平台注入环境变量，dotenv 不会覆盖已有变量
import 'dotenv/config';

import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import './db'; // 启动时初始化数据库连接并建表
import { success, fail } from './utils/response';
import { errorHandler } from './middleware/errorHandler';
import videosRouter from './routes/videos';
import tagsRouter from './routes/tags';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// 上传目录：本地默认 server/uploads，生产由 UPLOADS_DIR 指定（如 Railway volume）
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, '../uploads');

// CORS 配置：本地开发允许全部；生产通过 CORS_ORIGIN 指定白名单
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : undefined;

app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json());

// 静态文件服务：使 uploads 目录下的视频/缩略图可通过 HTTP 访问
app.use('/uploads', express.static(UPLOADS_DIR));

/**
 * 健康检查接口
 * GET /api/health -> { code: 0, data: { status: 'ok' } }
 */
app.get('/api/health', (_req: Request, res: Response) => {
  success(res, { status: 'ok' });
});

/**
 * 演示接口：测试统一失败响应格式
 * GET /api/demo/error -> { code: 1, message: '...' }
 */
app.get('/api/demo/error', () => {
  // 抛出异常，由全局错误处理中间件捕获
  throw new Error('这是一个演示错误');
});

// 视频相关接口
app.use('/api/videos', videosRouter);

// 标签相关接口
app.use('/api/tags', tagsRouter);

// 404 处理（未匹配到任何路由）
app.use((_req: Request, res: Response) => {
  fail(res, '接口不存在', 404);
});

// 全局错误处理中间件（必须放在所有路由之后）
app.use(errorHandler);

// 启动服务
app.listen(PORT, () => {
  console.log(`[server] running at http://localhost:${PORT}`);
});
