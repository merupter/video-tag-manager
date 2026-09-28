import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 前端开发服务器，将 /api 请求代理到后端 3001 端口，避免跨域
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // 视频和缩略图也代理到后端静态文件服务
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
