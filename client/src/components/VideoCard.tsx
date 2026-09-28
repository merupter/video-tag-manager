import type { Video } from '../types';
import { assetUrl } from '../api';

interface VideoCardProps {
  video: Video;
  onPreview: (video: Video) => void;
  onDelete: (id: number) => void;
}

// 把秒数格式化为 mm:ss 或 hh:mm:ss
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function VideoCard({ video, onPreview, onDelete }: VideoCardProps) {
  const thumbUrl = video.thumbnail_path
    ? assetUrl(video.thumbnail_path)
    : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" viewBox="0 0 320 180"><rect width="320" height="180" fill="%23e2e8f0"/><text x="160" y="100" text-anchor="middle" fill="%2394a3b8" font-size="16">无缩略图</text></svg>';

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`确定删除视频「${video.filename}」吗？`)) {
      onDelete(video.id);
    }
  }

  return (
    <div className="video-card" onClick={() => onPreview(video)}>
      <div className="card-thumb">
        <img src={thumbUrl} alt={video.filename} loading="lazy" />
        <span className="duration-badge">{formatDuration(video.duration)}</span>
        <button className="delete-btn" onClick={handleDelete} title="删除">
          ✕
        </button>
      </div>
      <div className="card-info">
        <p className="card-filename" title={video.filename}>
          {video.filename}
        </p>
        <div className="card-tags">
          {video.tags.length > 0 ? (
            video.tags.map((tag) => (
              <span key={tag.id} className="card-tag">
                {tag.name}
              </span>
            ))
          ) : (
            <span className="card-tag-empty">暂无标签</span>
          )}
        </div>
      </div>
    </div>
  );
}
