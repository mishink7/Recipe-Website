"use client";

export type TagMode = "AND" | "OR" | "SINGLE";

interface TagFilterProps {
  allTags: string[];
  selectedTags: string[];
  mode: TagMode;
  onTagToggle: (tag: string) => void;
  onModeChange: (mode: TagMode) => void;
}

export default function TagFilter({ allTags, selectedTags, mode, onTagToggle, onModeChange }: TagFilterProps) {
  const modes: TagMode[] = ["AND", "OR", "SINGLE"];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted">Filter mode:</span>
        <div className="flex rounded-lg border border-card-border overflow-hidden">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === m
                  ? "bg-accent text-white"
                  : "bg-card-bg text-muted hover:bg-muted-bg"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                active
                  ? "bg-accent text-white border-accent"
                  : "bg-card-bg text-muted border-card-border hover:border-accent hover:text-accent"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>
    </div>
  );
}
