"use client";

import { useState, useEffect, use } from "react";
import type { Recipe } from "@/types/recipe";
import RecipeForm from "@/components/admin/RecipeForm";
import { useAdmin } from "@/lib/admin-context";

export default function EditRecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { password } = useAdmin();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Load recipe data from the static JSON (fetched client-side)
    fetch(`/api/admin/recipe/${slug}`, {
      headers: { "x-admin-password": password },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setRecipe(data);
        }
      })
      .catch(() => setError("Failed to load recipe"))
      .finally(() => setLoading(false));

    fetch("/api/admin/tags", { headers: { "x-admin-password": password } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAvailableTags(data); })
      .catch(() => {});
  }, [slug, password]);

  const handleSave = async (payload: {
    recipeData: Partial<Recipe>;
    imageUrl?: string;
    imageBase64?: string;
  }) => {
    const res = await fetch("/api/admin/save", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ ...payload, editSlug: slug }),
    });

    return res.json();
  };

  if (loading) {
    return <div className="text-muted">Loading recipe...</div>;
  }

  if (error || !recipe) {
    return <div className="text-red-500">{error || "Recipe not found"}</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Edit: {recipe.title}
      </h2>
      <RecipeForm
        initialData={recipe}
        imageUrl={recipe.image || undefined}
        availableTags={availableTags}
        onSave={handleSave}
      />
    </div>
  );
}
