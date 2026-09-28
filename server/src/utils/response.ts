import type { Response } from 'express';

/**
 * 统一响应格式
 * 成功：{ code: 0, data: ... }
 * 失败：{ code: 1, message: '错误信息' }
 */

export interface ApiSuccess<T> {
  code: 0;
  data: T;
}

export interface ApiError {
  code: 1;
  message: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

/**
 * 成功响应
 */
export function success<T>(res: Response, data: T, statusCode = 200): Response<ApiSuccess<T>> {
  return res.status(statusCode).json({ code: 0, data });
}

/**
 * 失败响应
 */
export function fail(res: Response, message: string, statusCode = 400): Response<ApiError> {
  return res.status(statusCode).json({ code: 1, message });
}

/**
 * 业务错误类：携带 HTTP 状态码
 * 用于区分客户端错误（4xx）和服务器错误（5xx）
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
