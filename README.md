# 视频素材标签管理平台

一个全栈视频素材管理工具：上传视频自动生成缩略图、打标签、按标签筛选与搜索、内嵌播放器预览。
前后端分离，结构清晰，可直接部署到 Railway（后端）+ Vercel（前端）。

## 技术栈

- **前端**：React 18 + TypeScript + Vite
- **后端**：Node.js + Express + TypeScript
- **数据库**：SQLite（`better-sqlite3`）
- **媒体处理**：`ffmpeg-static`（截第 1 秒帧作缩略图）、`multer`（文件上传）

## 功能

- 拖拽上传视频（mp4 / mov / avi / mkv，最大 2GB），实时进度
- 自动用 ffmpeg 截取第 1 秒帧作为缩略图
- 视频卡片列表（缩略图 + 文件名 + 时长 + 标签）
- 标签管理：给视频加/去标签，新标签自动创建，已存在复用
- 标签筛选 + 文件名模糊搜索
- 自定义视频播放器：播放/暂停、进度拖动、音量控制、空格快捷键、ESC 关闭
- 空状态 / loading / 错误提示 / 删除二次确认

## 目录结构

```
video-tag-manager/
├── client/                  # 前端 React + TS + Vite
│   ├── src/
│   │   ├── api.ts                  # API 请求封装 + API_BASE
│   │   ├── types.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── index.css
│   │   └── components/
│   │       ├── UploadArea.tsx       # 拖拽上传 + 进度条
│   │       ├── TagFilter.tsx        # 标签筛选 + 搜索
│   │       ├── VideoList.tsx        # 卡片列表 + 空状态
│   │       ├── VideoCard.tsx        # 单卡片
│   │       ├── VideoPreviewModal.tsx# 播放弹窗 + 标签编辑
│   │       └── TagEditor.tsx
│   ├── vite.config.ts              # dev: /api /uploads 反向代理
│   ├── .env.example
│   └── package.json
├── server/                  # 后端 Node + Express + TS
│   ├── src/
│   │   ├── index.ts                # Express 入口
│   │   ├── db.ts                   # SQLite 连接 + 自动建表
│   │   ├── routes/
│   │   │   ├── videos.ts           # 视频增删查 + 标签关联
│   │   │   └── tags.ts             # 标签列表
│   │   ├── middleware/
│   │   │   ├── upload.ts           # multer 上传
│   │   │   └── errorHandler.ts
│   │   ├── services/ffmpeg.ts      # 时长 / 缩略图
│   │   └── utils/response.ts       # 统一响应 + AppError
│   ├── data/                       # SQLite 文件（不入库）
│   ├── uploads/                    # 视频与缩略图（不入库）
│   ├── Dockerfile                  # Railway 部署用
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## 本地开发

### 1. 启动后端（端口 3001）

```bash
cd server
cp .env.example .env     # Windows: copy .env.example .env
npm install
npm run dev              # tsx watch 热重载
```

访问 `http://localhost:3001/api/health`，应返回：

```json
{ "code": 0, "data": { "status": "ok" } }
```

### 2. 启动前端（端口 5173）

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

访问 `http://localhost:5173`。Vite 已配置反向代理：前端 `/api/*` 与 `/uploads/*` 自动转发到后端 `localhost:3001`，无需在 .env 配置 `VITE_API_BASE`。

### 生产构建

```bash
# 后端
cd server && npm run build && npm start

# 前端（产物在 client/dist）
cd client && npm run build
```

## 环境变量

### 后端 `server/.env`

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `PORT` | 服务端口 | `3001`（Railway 自动注入 `PORT`） |
| `DATA_DIR` | SQLite 数据目录 | `server/data`，生产建议挂载 volume |
| `UPLOADS_DIR` | 视频与缩略图目录 | `server/uploads`，生产建议挂载 volume |
| `CORS_ORIGIN` | 允许的前端域名，逗号分隔；留空表示允许全部 | 空（本地开发） |

### 前端 `client/.env`

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_API_BASE` | 后端 API 基础地址；本地留空走 Vite 代理，生产填 Railway 后端域名 | 空 |

## API 列表

统一响应格式：成功 `{ code: 0, data: ... }`，失败 `{ code: 1, message: '...' }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/videos?tag=xxx&search=xxx` | 视频列表（支持按标签筛选、文件名模糊搜索） |
| POST | `/api/videos` | 上传视频（multipart，字段 `video`），返回 id 与路径 |
| DELETE | `/api/videos/:id` | 删除视频（同时删除文件与缩略图） |
| POST | `/api/videos/:id/tags` | 给视频加标签，body `{ name: string }`，标签不存在自动创建 |
| DELETE | `/api/videos/:id/tags/:tagId` | 移除视频的某个标签（不删除标签本身） |
| GET | `/api/tags` | 所有标签列表 |

## 生产部署

### 后端 → Railway

1. 在 GitHub 推送代码后，在 Railway 控制台「New Project → Deploy from GitHub repo」选择本仓库
2. **Root Directory** 设为 `server`（ Railway 会自动识别 `Dockerfile`）
3. 在 **Variables** 中添加：
   - `CORS_ORIGIN` = 你的 Vercel 域名，如 `https://your-app.vercel.app`
4. 在 **Settings → Volumes** 添加两个 volume mount：
   - `/data`（SQLite 数据库持久化）
   - `/uploads`（视频与缩略图持久化）
5. Railway 会自动构建并部署，部署成功后拿到 `https://xxx.up.railway.app`

### 前端 → Vercel

1. 在 Vercel 控制台「Add New → Project」导入 GitHub 仓库
2. 配置：
   - **Root Directory**：`client`
   - **Framework Preset**：Vite
   - **Build Command**：`npm run build`
   - **Output Directory**：`dist`
   - **Environment Variables**：
     - `VITE_API_BASE` = Railway 后端域名，如 `https://xxx.up.railway.app`
3. 部署成功后访问 Vercel 域名即可

> 注意：上线后需要让后端 CORS 允许 Vercel 域名（已通过 `CORS_ORIGIN` 配置）。

## 开发环境要求

- Node.js 18+（已在 Node 20 / 24 验证）
- Windows 用户首次安装 `better-sqlite3` 时如遇编译错误：
  - `better-sqlite3@13` 已自带 Node 20+ 的预编译二进制，正常情况下 `npm install` 即可
  - 若仍报 `node-gyp` 错误，请安装 Python 3 和 Visual Studio Build Tools（C++ 工作负载）