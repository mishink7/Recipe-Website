"use client";

import { useState, useEffect } from "react";
import type { Recipe } from "@/types/recipe";
import RecipeForm from "@/components/admin/RecipeForm";
import { useAdminPassword } from "@/components/admin/AdminAuth";

export default function ManualEntryPage() {
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const password = useAdminPassword();

  useEffect(() => {
    fetch("/api/admin/tags", { headers: { "x-admin-password": password } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAvailableTags(data); })
      .catch(() => {});
  }, [password]);

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
      body: JSON.stringify(payload),
    });

    return res.json();
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-4">
        Add a Recipe Manually
      </h2>
      <RecipeForm availableTags={availableTags} onSave={handleSave} />
    </div>
  );
}
