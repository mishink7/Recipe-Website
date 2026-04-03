"use client";

import { useState } from "react";
import type { Recipe } from "@/types/recipe";
import DynamicList from "./DynamicList";
import TagSelector from "./TagSelector";
import ImageUpload from "./ImageUpload";

interface RecipeFormProps {
  initialData?: Partial<Recipe>;
  imageUrl?: string;
  availableTags: string[];
  onSave: (data: {
    recipeData: Partial<Recipe>;
    imageUrl?: string;
    imageBase64?: string;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
}

export default function RecipeForm({ initialData, imageUrl, availableTags, onSave }: RecipeFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [source, setSource] = useState(initialData?.source || "");
  const [prepTime, setPrepTime] = useState(initialData?.prepTime || "");
  const [cookTime, setCookTime] = useState(initialData?.cookTime || "");
  const [servings, setServings] = useState(initialData?.servings?.toString() || "");
  const [ingredients, setIngredients] = useState<string[]>(initialData?.ingredients || [""]);
  const [instructions, setInstructions] = useState<string[]>(initialData?.instructions || [""]);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setResult(null);

    try {
      const recipeData: Partial<Recipe> = {
        title,
        description: description || undefined,
        source: source || undefined,
        prepTime: prepTime || undefined,
        cookTime: cookTime || undefined,
        servings: servings ? parseInt(servings, 10) : undefined,
        ingredients: ingredients.filter((i) => i.trim()),
        instructions: instructions.filter((i) => i.trim()),
        tags,
        notes: notes || undefined,
      };

      const res = await onSave({
        recipeData,
        imageUrl: imageUrl || undefined,
        imageBase64: imageBase64 || undefined,
      });

      if (res.success) {
        setResult({ success: true, message: res.message || "Recipe saved!" });
      } else {
        setResult({ success: false, message: res.error || "Failed to save recipe" });
      }
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "An error occurred" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Recipe title"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-y"
          placeholder="Short description of the recipe"
        />
      </div>

      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Source</label>
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="URL or 'family recipe'"
        />
      </div>

      {/* Times & Servings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Prep Time</label>
          <input
            type="text"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="e.g. 15 min"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Cook Time</label>
          <input
            type="text"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="e.g. 30 min"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Servings</label>
          <input
            type="number"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="e.g. 4"
          />
        </div>
      </div>

      {/* Image */}
      <ImageUpload
        imageUrl={imageUrl}
        onFileSelect={setImageBase64}
      />

      {/* Tags */}
      <TagSelector selected={tags} onChange={setTags} availableTags={availableTags} />

      {/* Ingredients */}
      <DynamicList
        label="Ingredients"
        items={ingredients}
        onChange={setIngredients}
        placeholder="e.g. 2 cups flour"
      />

      {/* Instructions */}
      <DynamicList
        label="Instructions"
        items={instructions}
        onChange={setInstructions}
        placeholder="Step description..."
        multiline
      />

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-y"
          placeholder="Optional cooking tips or notes"
        />
      </div>

      {/* Result message */}
      {result && (
        <div
          className={`p-4 rounded-lg border ${
            result.success
              ? "bg-accent-light/30 border-accent text-accent-dark"
              : "bg-red-50 border-red-300 text-red-700 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
          }`}
        >
          {result.message}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="w-full px-6 py-3 rounded-lg bg-accent text-white font-medium hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : "Save Recipe"}
      </button>
    </form>
  );
}
