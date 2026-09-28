import type { Tag } from '../types';

interface TagFilterProps {
  tags: Tag[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export default function TagFilter({
  tags,
  selectedTag,
  onSelectTag,
  search,
  onSearchChange,
}: TagFilterProps) {
  return (
    <div className="tag-filter">
      <div className="tag-chips">
        <button
          className={`tag-chip ${selectedTag === null ? 'active' : ''}`}
          onClick={() => onSelectTag(null)}
        >
          全部
        </button>
        {tags.map((tag) => (
          <button
            key={tag.id}
            className={`tag-chip ${selectedTag === tag.name ? 'active' : ''}`}
            onClick={() => onSelectTag(tag.name)}
          >
            {tag.name}
          </button>
        ))}
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="按文件名搜索…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </div>
  );
}
