/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * 后端 API 基础地址
   * - 本地开发留空（走 Vite proxy）
   * - 生产部署填 Railway 后端域名，如 https://your-backend.up.railway.app
   */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
