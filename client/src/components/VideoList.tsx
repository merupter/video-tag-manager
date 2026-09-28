import type { Video } from '../types';
import VideoCard from './VideoCard';

interface VideoListProps {
  videos: Video[];
  loading: boolean;
  onPreview: (video: Video) => void;
  onDelete: (id: number) => void;
}

export default function VideoList({ videos, loading, onPreview, onDelete }: VideoListProps) {
  if (loading) {
    return <div className="list-loading">加载中…</div>;
  }

  if (videos.length === 0) {
    return (
      <div className="list-empty">
        <div className="empty-icon">🎬</div>
        <p>还没有视频，上传第一个吧</p>
      </div>
    );
  }

  return (
    <div className="video-grid">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
