import type { ApiResponse, Video, Tag, UploadResult } from './types';

/**
 * 后端 API 基础地址
 * - 本地开发：留空，走 Vite 配置的 /api 与 /uploads 反向代理到 localhost:3001
 * - 生产部署：在 .env 或 Vercel 控制台设置 VITE_API_BASE=https://your-backend.up.railway.app
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';

/**
 * 把数据库存的相对路径（如 'uploads/xxx.mp4'、'uploads/thumbnails/xxx.jpg'）
 * 转成可访问的绝对 URL
 * - 本地：'/uploads/xxx.mp4'（走 Vite proxy）
 * - 生产：'https://your-backend.up.railway.app/uploads/xxx.mp4'
 */
export function assetUrl(relPath: string): string {
  return `${API_BASE}/${relPath}`;
}

/**
 * 统一请求函数
 * 成功返回 data，失败抛出 Error(message)
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, options);
  const json: ApiResponse<T> = await res.json().catch(() => ({ code: 1, message: '响应解析失败' } as ApiResponse<T>));

  if (json.code !== 0) {
    throw new Error(json.message || '请求失败');
  }
  return json.data;
}

/**
 * 获取视频列表
 * @param tag    按标签筛选
 * @param search 按文件名模糊搜索
 */
export function fetchVideos(tag?: string, search?: string): Promise<Video[]> {
  const params = new URLSearchParams();
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);
  const qs = params.toString();
  return request<Video[]>(`/api/videos${qs ? `?${qs}` : ''}`);
}

/**
 * 获取所有标签
 */
export function fetchTags(): Promise<Tag[]> {
  return request<Tag[]>('/api/tags');
}

/**
 * 上传视频
 * @param file     视频文件
 * @param onProgress 上传进度回调 (0-100)
 */
export function uploadVideo(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/videos`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const json: ApiResponse<UploadResult> = JSON.parse(xhr.responseText);
        if (json.code !== 0) {
          reject(new Error(json.message || '上传失败'));
          return;
        }
        resolve(json.data);
      } catch {
        reject(new Error('响应解析失败'));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误'));
    xhr.send(formData);
  });
}

/**
 * 删除视频
 */
export function deleteVideo(id: number): Promise<{ id: number }> {
  return request<{ id: number }>(`/api/videos/${id}`, { method: 'DELETE' });
}

/**
 * 给视频添加标签（标签不存在则自动创建）
 */
export function addTagToVideo(videoId: number, name: string): Promise<Tag> {
  return request<Tag>(`/api/videos/${videoId}/tags`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

/**
 * 移除视频的某个标签
 */
export function removeTagFromVideo(videoId: number, tagId: number): Promise<void> {
  return request<void>(`/api/videos/${videoId}/tags/${tagId}`, { method: 'DELETE' });
}
