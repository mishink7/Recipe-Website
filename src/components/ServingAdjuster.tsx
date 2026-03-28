"use client";

interface ServingAdjusterProps {
  servings: number;
  onChange: (servings: number) => void;
}

export default function ServingAdjuster({ servings, onChange }: ServingAdjusterProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, servings - 1))}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-card-border text-foreground hover:bg-muted-bg transition-colors"
        aria-label="Decrease servings"
      >
        -
      </button>
      <span className="text-sm font-medium w-6 text-center">{servings}</span>
      <button
        onClick={() => onChange(servings + 1)}
        className="w-7 h-7 flex items-center justify-center rounded-md border border-card-border text-foreground hover:bg-muted-bg transition-colors"
        aria-label="Increase servings"
      >
        +
      </button>
    </div>
  );
}
