"use client";

import { useState } from "react";
import Link from "next/link";
import type { FeaturedRecipe } from "@/types/recipe";
import { useAdmin } from "@/lib/admin-context";

interface FeaturedRecipeCardProps {
  data: FeaturedRecipe;
}

export default function FeaturedRecipeCard({ data }: FeaturedRecipeCardProps) {
  const { isAdmin, password } = useAdmin();
  const [added, setAdded] = useState(data.added);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const res = await fetch("/api/admin/add-featured", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
      });
      const result = await res.json();
      if (result.success) {
        setAdded(true);
      } else {
        alert(`Failed to add: ${result.error}`);
      }
    } catch {
      alert("Failed to add recipe");
    } finally {
      setAdding(false);
    }
  };

  const { recipe, imageUrl, sourceSite } = data;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <h2 className="text-base font-bold uppercase tracking-widest text-accent flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Pick of the Day
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>
      <div className="rounded-xl border-2 border-accent/30 bg-card-bg overflow-hidden">
        <div className="flex flex-col sm:flex-row">
        {/* Image */}
        {imageUrl && (
          <Link href="/featured" className="sm:w-72 sm:shrink-0 block">
            <img
              src={imageUrl}
              alt={recipe.title || ""}
              className="w-full h-48 sm:h-full object-cover hover:opacity-90 transition-opacity"
            />
          </Link>
        )}

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col gap-3">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-gradient-from to-gradient-to text-white">
              Daily Pick
            </span>
            <span className="text-xs text-muted">
              from {sourceSite}
            </span>
          </div>

          {/* Title */}
          <Link href="/featured" className="hover:text-accent transition-colors">
            <h3 className="text-xl font-bold text-foreground leading-tight">
              {recipe.title}
            </h3>
          </Link>

          {/* Description */}
          {recipe.description && (
            <p className="text-sm text-muted line-clamp-2">
              {recipe.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            {recipe.prepTime && <span>Prep: {recipe.prepTime}</span>}
            {recipe.cookTime && <span>Cook: {recipe.cookTime}</span>}
            {recipe.servings && <span>Serves: {recipe.servings}</span>}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-auto pt-2">
            {recipe.source && (
              <a
                href={recipe.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:text-accent-dark transition-colors underline"
              >
                View Original
              </a>
            )}

            {isAdmin && !added && (
              <button
                onClick={handleAdd}
                disabled={adding}
                className="ml-auto px-4 py-1.5 text-sm rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add to Collection"}
              </button>
            )}

            {added && (
              <span className="ml-auto px-3 py-1.5 text-sm rounded-lg bg-accent-light text-accent-dark border border-accent flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added
              </span>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
