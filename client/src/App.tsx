import { useCallback, useEffect, useState } from 'react';
import type { Video, Tag } from './types';
import { fetchVideos, fetchTags, deleteVideo } from './api';
import UploadArea from './components/UploadArea';
import TagFilter from './components/TagFilter';
import VideoList from './components/VideoList';
import VideoPreviewModal from './components/VideoPreviewModal';

export default function App() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // 加载视频列表
  const loadVideos = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchVideos(selectedTag || undefined, search || undefined);
      setVideos(list);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载视频列表失败');
    } finally {
      setLoading(false);
    }
  }, [selectedTag, search]);

  // 加载标签列表
  const loadTags = useCallback(async () => {
    try {
      const list = await fetchTags();
      setTags(list);
    } catch {
      // 标签加载失败不阻断主流程
    }
  }, []);

  // 首次加载 + 筛选条件变化时刷新
  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // 提示信息
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  // 上传成功后刷新列表和标签
  function handleUploaded() {
    showToast('上传成功');
    loadVideos();
    loadTags();
  }

  // 删除视频
  async function handleDelete(id: number) {
    try {
      await deleteVideo(id);
      showToast('删除成功');
      setVideos((prev) => prev.filter((v) => v.id !== id));
      loadTags(); // 标签可能因级联删除而变化
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败');
    }
  }

  // 视频标签变更后同步到列表和预览弹窗
  function handleTagsChange(videoId: number, newTags: Tag[]) {
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, tags: newTags } : v)),
    );
    setPreviewVideo((prev) =>
      prev && prev.id === videoId ? { ...prev, tags: newTags } : prev,
    );
    loadTags(); // 标签列表可能变化（新建了标签）
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>视频素材标签管理平台</h1>
      </header>

      <main className="app-main">
        {/* 上传区域 */}
        <section className="section">
          <UploadArea onUploaded={handleUploaded} />
        </section>

        {/* 标签筛选 + 搜索 */}
        <section className="section">
          <TagFilter
            tags={tags}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            search={search}
            onSearchChange={setSearch}
          />
        </section>

        {/* 视频列表 */}
        <section className="section">
          <VideoList
            videos={videos}
            loading={loading}
            onPreview={setPreviewVideo}
            onDelete={handleDelete}
          />
        </section>
      </main>

      {/* 视频预览弹窗 */}
      <VideoPreviewModal
        video={previewVideo}
        allTags={tags}
        onTagsChange={handleTagsChange}
        onClose={() => setPreviewVideo(null)}
      />

      {/* 全局提示 */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
