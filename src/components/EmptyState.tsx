"use client";

interface EmptyStateProps {
  onClear: () => void;
}

export default function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <svg className="w-16 h-16 text-muted mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <h3 className="text-lg font-semibold text-foreground mb-1">No recipes found</h3>
      <p className="text-muted mb-4">Try adjusting your search or filters.</p>
      <button
        onClick={onClear}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors"
      >
        Clear all filters
      </button>
    </div>
  );
}
