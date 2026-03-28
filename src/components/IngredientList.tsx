"use client";

import { useState } from "react";

interface IngredientListProps {
  ingredients: string[];
  scale: number;
}

function scaleIngredient(ingredient: string, scale: number): string {
  if (scale === 1) return ingredient;
  return ingredient.replace(/(\d+\.?\d*)/g, (match) => {
    const num = parseFloat(match);
    const scaled = num * scale;
    return scaled % 1 === 0 ? scaled.toString() : scaled.toFixed(1);
  });
}

export default function IngredientList({ ingredients, scale }: IngredientListProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <ul className="flex flex-col gap-2">
      {ingredients.map((ing, i) => (
        <li key={i} className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={checked.has(i)}
            onChange={() => toggle(i)}
            className="mt-1 w-4 h-4 rounded border-card-border text-accent focus:ring-accent accent-[var(--accent)]"
          />
          <span className={`text-sm leading-relaxed ${checked.has(i) ? "line-through text-muted" : "text-foreground"}`}>
            {scaleIngredient(ing, scale)}
          </span>
        </li>
      ))}
    </ul>
  );
}
