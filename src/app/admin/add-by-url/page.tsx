"use client";

import { useState, useEffect } from "react";
import type { Recipe } from "@/types/recipe";
import RecipeForm from "@/components/admin/RecipeForm";
import { useAdminPassword } from "@/components/admin/AdminAuth";

export default function AddByUrlPage() {
  const [url, setUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState("");
  const [scrapedData, setScrapedData] = useState<Partial<Recipe> | null>(null);
  const [scrapedImageUrl, setScrapedImageUrl] = useState<string | undefined>();
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const password = useAdminPassword();

  useEffect(() => {
    fetch("/api/admin/tags", { headers: { "x-admin-password": password } })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAvailableTags(data); })
      .catch(() => {});
  }, [password]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setScraping(true);
    setError("");
    setScrapedData(null);

    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Scraping failed");
        return;
      }

      setScrapedData(data.recipe);
      setScrapedImageUrl(data.imageUrl);
    } catch {
      setError("Failed to connect to the server");
    } finally {
      setScraping(false);
    }
  };

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
      {/* URL input */}
      <form onSubmit={handleScrape} className="mb-8">
        <label className="block text-sm font-medium text-foreground mb-2">Recipe URL</label>
        <div className="flex gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.allrecipes.com/recipe/..."
            required
            className="flex-1 px-4 py-2 rounded-lg border border-card-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={scraping}
            className="px-6 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-dark transition-colors disabled:opacity-50"
          >
            {scraping ? "Scraping..." : "Scrape"}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </form>

      {/* Scraped result — editable form */}
      {scrapedData && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Review & Edit
          </h2>
          <RecipeForm
            initialData={scrapedData}
            imageUrl={scrapedImageUrl}
            availableTags={availableTags}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
