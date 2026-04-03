"use client";

import { useState } from "react";

interface TagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  availableTags: string[];
}

export default function TagSelector({ selected, onChange, availableTags }: TagSelectorProps) {
  const [newTag, setNewTag] = useState("");

  const toggleTag = (tag: string) => {
    if (selected.includes(tag)) {
      onChange(selected.filter((t) => t !== tag));
    } else {
      onChange([...selected, tag]);
    }
  };

  const addNewTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !selected.includes(tag)) {
      onChange([...selected, tag]);
    }
    setNewTag("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addNewTag();
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">Tags</label>
      <div className="flex flex-wrap gap-2 mb-3">
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              selected.includes(tag)
                ? "bg-accent-light text-accent-dark border-accent"
                : "bg-muted-bg text-muted border-card-border hover:border-accent"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add new tag..."
          className="flex-1 px-3 py-1.5 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
        />
        <button
          type="button"
          onClick={addNewTag}
          disabled={!newTag.trim()}
          className="px-3 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selected
            .filter((t) => !availableTags.includes(t))
            .map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs rounded-full bg-accent-light text-accent-dark border border-accent flex items-center gap-1"
              >
                {tag}
                <button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-500">
                  ✕
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
