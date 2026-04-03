import type { Recipe } from "@/types/recipe";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateRecipe(
  data: Partial<Recipe>
): { valid: true; recipe: Recipe } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!data.title?.trim()) errors.push("Title is required");
  if (!data.ingredients?.length) errors.push("At least one ingredient is required");
  if (!data.instructions?.length) errors.push("At least one instruction is required");

  if (errors.length > 0) return { valid: false, errors };

  const recipe: Recipe = {
    slug: data.slug || slugify(data.title!),
    title: data.title!.trim(),
    description: data.description?.trim() || null,
    tags: (data.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean),
    image: data.image || null,
    source: data.source?.trim() || null,
    prepTime: data.prepTime?.trim() || null,
    cookTime: data.cookTime?.trim() || null,
    servings: data.servings || null,
    ingredients: data.ingredients!.filter((i) => i.trim()),
    instructions: data.instructions!.filter((i) => i.trim()),
    notes: data.notes?.trim() || null,
    dateAdded: data.dateAdded || new Date().toISOString().split("T")[0],
  };

  return { valid: true, recipe };
}

export function addRecipeToCollection(
  recipes: Recipe[],
  newRecipe: Recipe
): { recipes: Recipe[]; error?: string } {
  const existing = recipes.find((r) => r.slug === newRecipe.slug);
  if (existing) {
    // Append a number to make slug unique
    let counter = 2;
    while (recipes.find((r) => r.slug === `${newRecipe.slug}-${counter}`)) {
      counter++;
    }
    newRecipe.slug = `${newRecipe.slug}-${counter}`;
  }

  const updated = [...recipes, newRecipe].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  return { recipes: updated };
}

export function collectTags(recipes: Recipe[]): string[] {
  const tagSet = new Set<string>();
  recipes.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}
