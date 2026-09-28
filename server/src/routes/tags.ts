import { Router, type Request, type Response } from 'express';
import db from '../db';
import { success } from '../utils/response';

const router = Router();

/**
 * 获取所有标签
 * GET /api/tags
 * 返回标签列表，按名称排序
 */
router.get('/', (_req: Request, res: Response) => {
  const tags = db
    .prepare('SELECT id, name FROM tags ORDER BY name ASC')
    .all() as Array<{ id: number; name: string }>;
  success(res, tags);
});

export default router;
