"use client";

export type SortOption = "alpha" | "date" | "prepTime";

interface ResultCountProps {
  shown: number;
  total: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "alpha", label: "A — Z" },
  { value: "date", label: "Recently Added" },
  { value: "prepTime", label: "Quickest first" },
];

export default function ResultCount({ shown, total, sort, onSortChange }: ResultCountProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted">
        Showing <span className="font-semibold text-foreground">{shown}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span> recipes
      </p>
      <div className="flex flex-wrap gap-2">
        {SORT_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onSortChange(value)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors ${
              sort === value
                ? "bg-accent text-white border-accent shadow-sm"
                : "bg-card-bg text-foreground border-card-border hover:border-accent hover:text-accent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
