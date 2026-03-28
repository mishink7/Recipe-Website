"use client";

export type SortOption = "alpha" | "date" | "prepTime";

interface ResultCountProps {
  shown: number;
  total: number;
  sort: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export default function ResultCount({ shown, total, sort, onSortChange }: ResultCountProps) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted">
        Showing <span className="font-semibold text-foreground">{shown}</span> of{" "}
        <span className="font-semibold text-foreground">{total}</span> recipes
      </p>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="text-sm border border-card-border rounded-lg px-3 py-1.5 bg-card-bg text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="alpha">A — Z</option>
        <option value="date">Newest first</option>
        <option value="prepTime">Quickest first</option>
      </select>
    </div>
  );
}
