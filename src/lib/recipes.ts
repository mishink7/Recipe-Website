import type { Recipe } from "@/types/recipe";
import type { TagMode } from "@/components/TagFilter";
import type { SortOption } from "@/components/ResultCount";
import recipesData from "@/data/recipes.json";

export function getAllRecipes(): Recipe[] {
  return recipesData as Recipe[];
}

export function getRecipeBySlug(slug: string): Recipe | undefined {
  return getAllRecipes().find((r) => r.slug === slug);
}

export function getAllTags(recipes: Recipe[]): string[] {
  const tagSet = new Set<string>();
  recipes.forEach((r) => r.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

export function filterRecipes(
  recipes: Recipe[],
  search: string,
  selectedTags: string[],
  tagMode: TagMode
): Recipe[] {
  let filtered = recipes;

  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.notes?.toLowerCase().includes(q)
    );
  }

  if (selectedTags.length > 0) {
    filtered = filtered.filter((r) => {
      if (tagMode === "AND") {
        return selectedTags.every((t) => r.tags.includes(t));
      }
      return selectedTags.some((t) => r.tags.includes(t));
    });
  }

  return filtered;
}

function parsePrepTime(time: string | undefined | null): number {
  if (!time) return Infinity;
  const match = time.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : Infinity;
}

export function sortRecipes(recipes: Recipe[], sort: SortOption): Recipe[] {
  const sorted = [...recipes];
  switch (sort) {
    case "alpha":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "date":
      return sorted.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
    case "prepTime":
      return sorted.sort((a, b) => parsePrepTime(a.prepTime) - parsePrepTime(b.prepTime));
    default:
      return sorted;
  }
}
