import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { scrapeRecipeFromUrl } from "@/lib/scrape-recipe";
import { commitFile } from "@/lib/github";
import type { FeaturedRecipe } from "@/types/recipe";

const SITES = [
  {
    name: "pinchofyum.com",
    sitemap: "https://pinchofyum.com/post-sitemap.xml",
  },
  {
    name: "loveandlemons.com",
    sitemap: "https://www.loveandlemons.com/post-sitemap.xml",
  },
  {
    name: "recipetineats.com",
    sitemap: "https://www.recipetineats.com/post-sitemap.xml",
  },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function isRecipeUrl(url: string): boolean {
  const path = new URL(url).pathname;
  // Skip category, tag, page, author, and root URLs
  if (
    path === "/" ||
    path.includes("/category/") ||
    path.includes("/tag/") ||
    path.includes("/page/") ||
    path.includes("/author/") ||
    path.includes("/about") ||
    path.includes("/contact") ||
    path.includes("/privacy") ||
    path.includes("/shop")
  ) {
    return false;
  }
  // Should be a single-segment path like /recipe-name/
  const segments = path.split("/").filter(Boolean);
  return segments.length === 1;
}

async function fetchSitemapUrls(
  sitemapUrl: string,
  maxAgeDays: number
): Promise<string[]> {
  const res = await fetch(sitemapUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; RecipeBot/1.0)",
    },
  });
  if (!res.ok) return [];

  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const urls: string[] = [];
  $("url").each((_, el) => {
    const loc = $(el).find("loc").text();
    const lastmod = $(el).find("lastmod").text();

    if (!loc || !isRecipeUrl(loc)) return;

    if (lastmod) {
      const date = new Date(lastmod);
      if (date < cutoff) return;
    }

    urls.push(loc);
  });

  return urls;
}

async function tryScrapeFromSite(
  siteIndex: number
): Promise<FeaturedRecipe | null> {
  const site = SITES[siteIndex % SITES.length];

  // Try 30 days first, then 60, then 90
  for (const days of [30, 60, 90]) {
    const urls = await fetchSitemapUrls(site.sitemap, days);
    if (urls.length === 0) continue;

    // Pick a random URL
    const url = urls[Math.floor(Math.random() * urls.length)];

    try {
      const result = await scrapeRecipeFromUrl(url);
      if (!result.recipe.title) continue;

      return {
        recipe: {
          ...result.recipe,
          source: url,
          dateAdded: new Date().toISOString().split("T")[0],
        },
        imageUrl: result.imageUrl || null,
        sourceSite: site.name,
        fetchedAt: new Date().toISOString().split("T")[0],
        added: false,
      };
    } catch {
      // Scrape failed, will try next iteration
      continue;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  // Auth: Vercel cron sends Authorization header
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dayOfYear = getDayOfYear();
    const baseSiteIndex = dayOfYear % SITES.length;

    // Try the primary site, then rotate to others if it fails
    let featured: FeaturedRecipe | null = null;
    for (let offset = 0; offset < SITES.length; offset++) {
      featured = await tryScrapeFromSite(baseSiteIndex + offset);
      if (featured) break;
    }

    if (!featured) {
      return NextResponse.json(
        { error: "Failed to scrape a recipe from any site" },
        { status: 500 }
      );
    }

    // Commit featured.json to GitHub
    const content = JSON.stringify(featured, null, 2) + "\n";
    await commitFile(
      "src/data/featured.json",
      content,
      `Update daily featured recipe: ${featured.recipe.title}`
    );

    return NextResponse.json({
      success: true,
      title: featured.recipe.title,
      source: featured.sourceSite,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Cron failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
