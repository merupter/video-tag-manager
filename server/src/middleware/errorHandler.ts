import type { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { fail, AppError } from '../utils/response';

// multer 内置错误码 -> 中文提示
const MULTER_ERROR_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: '文件大小超过限制',
  LIMIT_UNEXPECTED_FILE: '上传字段名错误，应为 video',
  LIMIT_FILE_COUNT: '文件数量超过限制',
};

/**
 * 全局错误处理中间件
 * 捕获所有未处理异常，统一返回 { code: 1, message } 格式
 *
 * 注意：必须是 4 个参数 (err, req, res, next)，Express 才会识别为错误处理中间件
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 业务错误：使用自带的状态码（通常 4xx）
  if (err instanceof AppError) {
    fail(res, err.message, err.statusCode);
    return;
  }

  // multer 上传错误：统一 400
  if (err instanceof MulterError) {
    fail(res, MULTER_ERROR_MESSAGES[err.code] || err.message, 400);
    return;
  }

  // 其他未预期错误：500
  console.error('[error]', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  fail(res, err.message || '服务器内部错误', 500);
}
