import { useState, type KeyboardEvent } from 'react';
import type { Tag } from '../types';
import { addTagToVideo, removeTagFromVideo } from '../api';

interface TagEditorProps {
  videoId: number;
  tags: Tag[];
  allTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagEditor({ videoId, tags, allTags, onChange }: TagEditorProps) {
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 已存在但未打在当前视频上的标签，供选择
  const availableTags = allTags.filter(
    (t) => !tags.some((vt) => vt.id === t.id),
  );

  async function handleAdd(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (tags.some((t) => t.name === trimmed)) {
      setInput('');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const newTag = await addTagToVideo(videoId, trimmed);
      onChange([...tags, newTag]);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(tagId: number) {
    try {
      await removeTagFromVideo(videoId, tagId);
      onChange(tags.filter((t) => t.id !== tagId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '移除失败');
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleAdd(input);
    }
  }

  return (
    <div className="tag-editor">
      <div className="tag-editor-current">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span key={tag.id} className="tag-editor-tag">
              {tag.name}
              <button
                className="tag-remove"
                onClick={() => handleRemove(tag.id)}
                title="移除标签"
              >
                ✕
              </button>
            </span>
          ))
        ) : (
          <span className="tag-editor-empty">暂无标签，输入后回车添加</span>
        )}
      </div>

      <div className="tag-editor-input-row">
        <input
          type="text"
          className="tag-editor-input"
          placeholder="输入新标签或选择已有标签，回车添加"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={saving}
        />
        <button
          className="tag-add-btn"
          onClick={() => handleAdd(input)}
          disabled={saving || !input.trim()}
        >
          添加
        </button>
      </div>

      {availableTags.length > 0 && (
        <div className="tag-suggestions">
          <span className="tag-suggestions-label">已有标签：</span>
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              className="tag-suggestion"
              onClick={() => handleAdd(tag.name)}
            >
              + {tag.name}
            </button>
          ))}
        </div>
      )}

      {error && <div className="tag-editor-error">{error}</div>}
    </div>
  );
}
