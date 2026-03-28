"use client";

import { useState, useMemo } from "react";
import SearchBar from "@/components/SearchBar";
import TagFilter, { type TagMode } from "@/components/TagFilter";
import ResultCount, { type SortOption } from "@/components/ResultCount";
import RecipeGrid from "@/components/RecipeGrid";
import EmptyState from "@/components/EmptyState";
import { getAllRecipes, getAllTags, filterRecipes, sortRecipes } from "@/lib/recipes";

export default function HomePage() {
  const allRecipes = getAllRecipes();
  const allTags = useMemo(() => getAllTags(allRecipes), [allRecipes]);

  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<TagMode>("OR");
  const [sort, setSort] = useState<SortOption>("alpha");

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
      {filtered.length > 0 ? (
        <RecipeGrid recipes={filtered} highlightedTags={selectedTags} />
      ) : (
        <EmptyState onClear={clearFilters} />
      )}
    </div>
  );
}
