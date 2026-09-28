import { useEffect, useRef, useState } from 'react';
import type { Video, Tag } from '../types';
import TagEditor from './TagEditor';
import { assetUrl } from '../api';

interface VideoPreviewModalProps {
  video: Video | null;
  allTags: Tag[];
  onTagsChange: (videoId: number, tags: Tag[]) => void;
  onClose: () => void;
}

// 秒数格式化为 mm:ss
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function VideoPreviewModal({
  video,
  allTags,
  onTagsChange,
  onClose,
}: VideoPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // ESC 关闭弹窗
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      // 空格播放/暂停
      if (e.key === ' ' && videoRef.current) {
        e.preventDefault();
        togglePlay();
      }
    }
    if (video) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, onClose]);

  // 打开新视频时重置状态
  useEffect(() => {
    if (video) {
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setVideoError(null);
    }
  }, [video]);

  if (!video) return null;

  const videoUrl = assetUrl(video.filepath);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch((err) => {
        console.error('播放失败:', err);
        setVideoError('播放失败，请刷新重试');
      });
    } else {
      v.pause();
    }
  }

  function handleTimeUpdate() {
    if (!videoRef.current || isDragging) return;
    setCurrentTime(videoRef.current.currentTime);
  }

  function handleLoadedMetadata() {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  }

  function handleProgressChange(e: React.ChangeEvent<HTMLInputElement>) {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      // 调节音量时自动取消静音
      videoRef.current.muted = vol === 0;
    }
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // 仅当点击遮罩层本身（而非内容区）时关闭，避免控件交互误关
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>

        {/* 视频播放区 */}
        <div className="player-wrapper">
          <video
            ref={videoRef}
            src={videoUrl}
            preload="auto"
            playsInline
            muted
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={() => setVideoError('视频加载失败')}
            onClick={togglePlay}
          />
          {videoError && <div className="video-error">{videoError}</div>}

          {/* 自定义控制条 */}
          <div className="player-controls">
            <button className="player-btn" onClick={togglePlay} title={isPlaying ? '暂停' : '播放'}>
              {isPlaying ? '⏸' : '▶'}
            </button>

            <span className="player-time">{formatTime(currentTime)}</span>

            <input
              type="range"
              className="player-progress"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleProgressChange}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              style={{ '--progress': `${progress}%` } as React.CSSProperties}
            />

            <span className="player-time">{formatTime(duration)}</span>

            <div className="player-volume">
              <span className="volume-icon">🔊</span>
              <input
                type="range"
                className="volume-slider"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={handleVolumeChange}
              />
            </div>
          </div>
        </div>

        {/* 视频信息 + 标签管理 */}
        <div className="modal-info">
          <h3 className="modal-filename">{video.filename}</h3>
          <TagEditor
            videoId={video.id}
            tags={video.tags}
            allTags={allTags}
            onChange={(tags) => onTagsChange(video.id, tags)}
          />
        </div>
      </div>
    </div>
  );
}
