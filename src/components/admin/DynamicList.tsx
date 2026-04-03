"use client";

interface DynamicListProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
}

export default function DynamicList({
  label,
  items,
  onChange,
  placeholder = "Add item...",
  multiline = false,
}: DynamicListProps) {
  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, ""]);
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    onChange(updated);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 items-start">
            <span className="text-xs text-muted mt-2.5 w-6 text-right shrink-0">{index + 1}.</span>
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                className="text-muted hover:text-foreground disabled:opacity-30 text-xs"
                title="Move up"
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => moveItem(index, 1)}
                disabled={index === items.length - 1}
                className="text-muted hover:text-foreground disabled:opacity-30 text-xs"
                title="Move down"
              >
                ▼
              </button>
            </div>
            {multiline ? (
              <textarea
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="flex-1 px-3 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm resize-y"
              />
            ) : (
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={placeholder}
                className="flex-1 px-3 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent text-sm"
              />
            )}
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-muted hover:text-red-500 transition-colors px-2 py-2 text-sm"
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addItem}
        className="mt-2 px-3 py-1.5 text-sm rounded-lg border border-dashed border-card-border text-muted hover:text-accent hover:border-accent transition-colors"
      >
        + Add {label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  );
}
