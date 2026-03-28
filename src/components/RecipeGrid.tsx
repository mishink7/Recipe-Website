import type { Recipe } from "@/types/recipe";
import RecipeCard from "./RecipeCard";

interface RecipeGridProps {
  recipes: Recipe[];
  highlightedTags?: string[];
}

export default function RecipeGrid({ recipes, highlightedTags = [] }: RecipeGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.slug} recipe={recipe} highlightedTags={highlightedTags} />
      ))}
    </div>
  );
}
