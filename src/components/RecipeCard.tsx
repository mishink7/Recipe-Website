import Link from "next/link";
import type { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
  highlightedTags?: string[];
}

export default function RecipeCard({ recipe, highlightedTags = [] }: RecipeCardProps) {
  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="group flex flex-col rounded-xl border border-card-border bg-card-bg overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {recipe.image ? (
          <img
            src={recipe.image}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gradient-from to-gradient-to" />
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
          <h3 className="text-white font-semibold text-lg leading-tight">{recipe.title}</h3>
        </div>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 text-xs rounded-full border ${
                highlightedTags.includes(tag)
                  ? "bg-accent-light text-accent-dark border-accent"
                  : "bg-muted-bg text-muted border-card-border"
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
        {recipe.description && (
          <p className="text-sm text-muted line-clamp-1">{recipe.description}</p>
        )}
      </div>
    </Link>
  );
}
