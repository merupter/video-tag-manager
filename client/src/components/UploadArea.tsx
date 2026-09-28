import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { uploadVideo } from '../api';

interface UploadAreaProps {
  onUploaded: () => void;
}

const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv'];

export default function UploadArea({ onUploaded }: UploadAreaProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 校验文件格式
  function validateFile(file: File): boolean {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`不支持的格式，仅允许: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    return true;
  }

  // 处理上传
  async function handleFile(file: File) {
    setError(null);
    if (!validateFile(file)) return;

    setUploading(true);
    setProgress(0);
    try {
      await uploadVideo(file, (p) => setProgress(p));
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  }

  // 点击选择文件
  function handleClick() {
    if (uploading) return;
    inputRef.current?.click();
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // 重置 input，允许重复选择同一文件
    e.target.value = '';
  }

  // 拖拽事件
  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!uploading) setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="upload-area">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,.avi,.mkv,video/*"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {uploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        ) : (
          <div className="drop-placeholder">
            <div className="drop-icon">📹</div>
            <p className="drop-text">
              <strong>点击选择</strong> 或 <strong>拖拽</strong> 视频到此处上传
            </p>
            <p className="drop-hint">支持 mp4, mov, avi, mkv 格式，最大 2GB</p>
          </div>
        )}
      </div>

      {error && <div className="upload-error">{error}</div>}
    </div>
  );
}
