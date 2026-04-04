"use client";

import Link from "next/link";
import type { Recipe } from "@/types/recipe";
import type { FeaturedRecipe } from "@/types/recipe";
import { useAdmin } from "@/lib/admin-context";
import { useState } from "react";
import featuredData from "@/data/featured.json";
import IngredientList from "@/components/IngredientList";
import InstructionList from "@/components/InstructionList";
import ServingAdjuster from "@/components/ServingAdjuster";

function toFullRecipe(featured: FeaturedRecipe): Recipe {
  return {
    slug: featured.recipe.slug || "featured",
    title: featured.recipe.title || "Featured Recipe",
    description: featured.recipe.description || null,
    tags: featured.recipe.tags || [],
    image: null,
    source: featured.recipe.source || null,
    prepTime: featured.recipe.prepTime || null,
    cookTime: featured.recipe.cookTime || null,
    servings: featured.recipe.servings || null,
    ingredients: featured.recipe.ingredients || [],
    instructions: featured.recipe.instructions || [],
    notes: featured.recipe.notes || null,
    dateAdded: featured.fetchedAt,
  };
}

export default function FeaturedPage() {
  const featured = featuredData as FeaturedRecipe | null;
  const { isAdmin, password } = useAdmin();
  const [added, setAdded] = useState(featured?.added || false);
  const [adding, setAdding] = useState(false);

  if (!featured || !featured.recipe.title) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="text-muted">No featured recipe available yet. Check back tomorrow!</p>
      </div>
    );
  }

  const recipe = toFullRecipe(featured);
  const baseServings = recipe.servings || 1;
  const [servings, setServings] = useState(baseServings);
  const scale = servings / baseServings;

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className="no-print inline-flex items-center gap-1 text-sm text-muted hover:text-accent transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All Recipes
      </Link>

      <article>
        {/* Daily Pick badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-gradient-from to-gradient-to text-white">
            Daily Pick
          </span>
          <span className="text-xs text-muted">from {featured.sourceSite}</span>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">{recipe.title}</h1>

        {recipe.description && (
          <p className="text-muted text-lg mb-4">{recipe.description}</p>
        )}

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 text-sm rounded-full bg-accent-light text-accent-dark border border-accent">
                {tag}
              </span>
            ))}
          </div>
        )}

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
              <a href={recipe.source} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors underline">
                View Original
              </a>
            </div>
          )}

          <div className="no-print ml-auto flex items-center gap-2">
            {isAdmin && !added && (
              <button
                onClick={handleAdd}
                disabled={adding}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-dark transition-colors disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add to Collection"}
              </button>
            )}
            {added && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-light text-accent-dark border border-accent text-sm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border hover:bg-muted-bg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
          </div>
        </div>

        {/* Featured image from external URL */}
        {featured.imageUrl && (
          <img
            src={featured.imageUrl}
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
    </div>
  );
}
