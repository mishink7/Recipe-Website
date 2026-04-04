"use client";

import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import SearchBar from "@/components/SearchBar";
import TagFilter, { type TagMode } from "@/components/TagFilter";
import ResultCount, { type SortOption } from "@/components/ResultCount";
import RecipeGrid from "@/components/RecipeGrid";
import EmptyState from "@/components/EmptyState";
import { getAllRecipes, getAllTags, filterRecipes, sortRecipes } from "@/lib/recipes";
import FeaturedRecipeCard from "@/components/FeaturedRecipeCard";
import featuredData from "@/data/featured.json";
import type { FeaturedRecipe } from "@/types/recipe";

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const allRecipes = getAllRecipes();
  const allTags = useMemo(() => getAllTags(allRecipes), [allRecipes]);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial state from URL params
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    const tags = searchParams.get("tags");
    return tags ? tags.split(",").filter(Boolean) : [];
  });
  const [tagMode, setTagMode] = useState<TagMode>(() => {
    const mode = searchParams.get("mode");
    return mode === "AND" || mode === "SINGLE" ? mode : "OR";
  });
  const [sort, setSort] = useState<SortOption>(() => {
    const s = searchParams.get("sort");
    return s === "date" || s === "prepTime" ? s : "alpha";
  });

  // Sync state to URL params
  const updateUrl = useCallback(
    (newSearch: string, newTags: string[], newMode: TagMode, newSort: SortOption) => {
      const params = new URLSearchParams();
      if (newSearch) params.set("q", newSearch);
      if (newTags.length > 0) params.set("tags", newTags.join(","));
      if (newMode !== "OR") params.set("mode", newMode);
      if (newSort !== "alpha") params.set("sort", newSort);
      const qs = params.toString();
      router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    },
    [router]
  );

  // Update URL when state changes
  useEffect(() => {
    updateUrl(search, selectedTags, tagMode, sort);
  }, [search, selectedTags, tagMode, sort, updateUrl]);

  const filtered = useMemo(
    () => sortRecipes(filterRecipes(allRecipes, search, selectedTags, tagMode), sort),
    [allRecipes, search, selectedTags, tagMode, sort]
  );

  const handleTagToggle = (tag: string) => {
    if (tagMode === "SINGLE") {
      setSelectedTags((prev) => (prev.includes(tag) ? [] : [tag]));
    } else {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedTags([]);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 flex flex-col gap-6">
      <SearchBar value={search} onChange={setSearch} />
      <TagFilter
        allTags={allTags}
        selectedTags={selectedTags}
        mode={tagMode}
        onTagToggle={handleTagToggle}
        onModeChange={setTagMode}
      />
      <ResultCount shown={filtered.length} total={allRecipes.length} sort={sort} onSortChange={setSort} />
      {!search && selectedTags.length === 0 && featuredData && (
        <FeaturedRecipeCard data={featuredData as FeaturedRecipe} />
      )}
      {filtered.length > 0 ? (
        <RecipeGrid recipes={filtered} highlightedTags={selectedTags} />
      ) : (
        <EmptyState onClear={clearFilters} />
      )}
    </div>
  );
}
