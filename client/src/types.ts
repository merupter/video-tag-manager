// 后端统一响应格式
export interface ApiResponse<T> {
  code: number;
  message?: string;
  data: T;
}

// 视频信息
export interface Video {
  id: number;
  filename: string;
  filepath: string;
  thumbnail_path: string | null;
  duration: number;
  created_at: string;
  tags: Tag[];
}

// 标签
export interface Tag {
  id: number;
  name: string;
}

// 上传接口返回
export interface UploadResult {
  id: number;
  filepath: string;
  thumbnail_path: string | null;
  duration: number;
  filename: string;
}
