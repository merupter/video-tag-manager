# 视频素材标签管理平台 - 后端 Docker 镜像
# 用于 Railway / Render / Fly.io 等容器化部署
#
# 本地构建测试：
#   docker build -f server/Dockerfile -t video-tag-manager-server .
#   docker run -p 3001:3001 -v $(pwd)/server/data:/data -v $(pwd)/server/uploads:/uploads video-tag-manager-server

# Node 20 LTS（Debian slim，原生模块 better-sqlite3 有预编译二进制）
FROM node:20-slim

# ffmpeg 用于截取视频缩略图
# python3 make g++ 是 better-sqlite3 在某些架构下需要编译时的兜底
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先复制 package 元数据利用 Docker 缓存
COPY server/package.json server/package-lock.json ./

# 安装依赖
RUN npm ci

# 复制源码与 tsconfig，编译 TypeScript
COPY server/tsconfig.json ./
COPY server/src ./src

RUN npm run build

# 创建数据与上传目录（生产环境用 volume 覆盖）
RUN mkdir -p /data /uploads/thumbnails

# 生产环境变量
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_DIR=/data \
    UPLOADS_DIR=/uploads

EXPOSE 3001

# 健康检查（ Railway 也会自动通过 PORT 探活）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
