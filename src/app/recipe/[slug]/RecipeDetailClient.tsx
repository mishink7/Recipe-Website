"use client";

import { useState } from "react";
import type { Recipe } from "@/types/recipe";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
import IngredientList from "@/components/IngredientList";
import InstructionList from "@/components/InstructionList";
import ServingAdjuster from "@/components/ServingAdjuster";

interface RecipeDetailClientProps {
  recipe: Recipe;
}

export default function RecipeDetailClient({ recipe }: RecipeDetailClientProps) {
  const baseServings = recipe.servings || 1;
  const [servings, setServings] = useState(baseServings);
  const scale = servings / baseServings;

  return (
    <article>
      <h1 className="text-3xl font-bold text-foreground mb-3">{recipe.title}</h1>

      {recipe.description && (
        <p className="text-muted text-lg mb-4">{recipe.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {recipe.tags.map((tag) => (
          <span key={tag} className="px-3 py-1 text-sm rounded-full bg-accent-light text-accent-dark border border-accent">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-muted mb-6 pb-6 border-b border-card-border">
        {recipe.prepTime && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Prep: {recipe.prepTime}
          </div>
        )}
        {recipe.cookTime && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            Cook: {recipe.cookTime}
          </div>
        )}
        {recipe.servings && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Servings:
            <ServingAdjuster servings={servings} onChange={setServings} />
          </div>
        )}
        {recipe.source && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {recipe.source.startsWith("http") ? (
              <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors underline">
                Source
              </a>
            ) : (
              <span>{recipe.source}</span>
            )}
          </div>
        )}
        <button
          onClick={() => window.print()}
          className="no-print ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border hover:bg-muted-bg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
      </div>

      {recipe.image && (
        <img
          src={`${basePath}${recipe.image}`}
          alt={recipe.title}
          className="w-full rounded-xl mb-8 max-h-96 object-cover"
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8">
        <div className="md:sticky md:top-20 md:self-start">
          <h2 className="text-lg font-semibold text-foreground mb-4">Ingredients</h2>
          <IngredientList ingredients={recipe.ingredients} scale={scale} />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Instructions</h2>
          <InstructionList instructions={recipe.instructions} />

          {recipe.notes && (
            <div className="mt-8 p-4 rounded-xl bg-muted-bg border border-card-border">
              <h3 className="text-sm font-semibold text-foreground mb-2">Notes</h3>
              <p className="text-sm text-muted leading-relaxed">{recipe.notes}</p>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
