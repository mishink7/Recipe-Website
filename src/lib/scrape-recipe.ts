import * as cheerio from "cheerio";
import type { Recipe } from "@/types/recipe";
import { slugify } from "./recipe-utils";

interface ScrapeResult {
  recipe: Partial<Recipe>;
  imageUrl?: string;
}

export function parseIsoDuration(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;

  const parts: string[] = [];
  if (match[1]) parts.push(`${match[1]} hr`);
  if (match[2]) parts.push(`${match[2]} min`);
  if (match[3] && !match[1] && !match[2]) parts.push(`${match[3]} sec`);
  return parts.join(" ") || iso;
}

function extractJsonLdRecipe(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    try {
      const data = JSON.parse($(scripts[i]).html() || "");

      // Direct Recipe object
      if (data["@type"] === "Recipe") return data;

      // Array of types (e.g., ["Recipe", "Something"])
      if (Array.isArray(data["@type"]) && data["@type"].includes("Recipe"))
        return data;

      // Inside @graph array
      if (data["@graph"] && Array.isArray(data["@graph"])) {
        const recipe = data["@graph"].find(
          (item: Record<string, unknown>) =>
            item["@type"] === "Recipe" ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
        );
        if (recipe) return recipe;
      }

      // Array of objects at top level
      if (Array.isArray(data)) {
        const recipe = data.find(
          (item: Record<string, unknown>) =>
            item["@type"] === "Recipe" ||
            (Array.isArray(item["@type"]) && item["@type"].includes("Recipe"))
        );
        if (recipe) return recipe;
      }
    } catch {
      // Invalid JSON, try next script
    }
  }
  return null;
}

function extractInstructions(instructions: unknown): string[] {
  if (!instructions) return [];

  if (typeof instructions === "string") {
    // HTML string — strip tags and split
    const $ = cheerio.load(instructions);
    return $.text()
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (Array.isArray(instructions)) {
    const result: string[] = [];
    for (const item of instructions) {
      if (typeof item === "string") {
        result.push(item.trim());
      } else if (item && typeof item === "object") {
        // HowToStep or HowToSection
        if (item.text) {
          result.push(String(item.text).trim());
        } else if (item.itemListElement && Array.isArray(item.itemListElement)) {
          // HowToSection with nested steps
          for (const step of item.itemListElement) {
            if (typeof step === "string") result.push(step.trim());
            else if (step?.text) result.push(String(step.text).trim());
          }
        }
      }
    }
    return result.filter(Boolean);
  }

  return [];
}

function extractImageUrl(image: unknown): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  if (Array.isArray(image)) return typeof image[0] === "string" ? image[0] : image[0]?.url;
  if (typeof image === "object" && image !== null && "url" in image)
    return String((image as { url: string }).url);
  return undefined;
}

function extractTags(data: Record<string, unknown>): string[] {
  const tags: string[] = [];

  const keywords = data.keywords;
  if (typeof keywords === "string") {
    tags.push(...keywords.split(/[,;]+/).map((k) => k.trim().toLowerCase()));
  } else if (Array.isArray(keywords)) {
    tags.push(...keywords.map((k) => String(k).trim().toLowerCase()));
  }

  const category = data.recipeCategory;
  if (typeof category === "string") {
    tags.push(category.trim().toLowerCase());
  } else if (Array.isArray(category)) {
    tags.push(...category.map((c) => String(c).trim().toLowerCase()));
  }

  return [...new Set(tags)].filter(Boolean);
}

function parseServings(yield_: unknown): number | null {
  if (!yield_) return null;
  const str = Array.isArray(yield_) ? String(yield_[0]) : String(yield_);
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractMetaFallback(html: string): ScrapeResult {
  const $ = cheerio.load(html);
  return {
    recipe: {
      title: $('meta[property="og:title"]').attr("content") || $("title").text() || "",
      description: $('meta[property="og:description"]').attr("content") || "",
    },
    imageUrl: $('meta[property="og:image"]').attr("content") || undefined,
  };
}

// Fallback for sites that publish Schema.org Recipe as HTML5 microdata
// (itemtype/itemprop attributes) instead of JSON-LD — e.g. EasyRecipe,
// older WP Recipe Maker, hand-rolled microdata.
function extractMicrodataRecipe(html: string): ScrapeResult | null {
  const $ = cheerio.load(html);
  const root = $('[itemtype*="schema.org/Recipe"]').first();
  if (root.length === 0) return null;

  const propText = (name: string): string => {
    const el = root.find(`[itemprop="${name}"]`).first();
    if (el.length === 0) return "";
    if (el.is("meta")) return (el.attr("content") || "").trim();
    if (el.is("img")) return (el.attr("src") || "").trim();
    return el.text().trim().replace(/\s+/g, " ");
  };

  const propTexts = (name: string): string[] => {
    const matches = root.find(`[itemprop="${name}"]`);
    if (matches.length === 0) return [];

    // Single-element case: extract <li> children if present, else split lines
    if (matches.length === 1) {
      const single = matches.first();
      const items = single.find("li");
      if (items.length > 0) {
        const out: string[] = [];
        items.each((_, el) => {
          const t = $(el).text().trim().replace(/\s+/g, " ");
          if (t) out.push(t);
        });
        if (out.length > 0) return out;
      }
      const text = single.text().trim();
      if (!text) return [];
      const lines = text.split(/\n/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean);
      return lines.length > 1 ? lines : [text.replace(/\s+/g, " ")];
    }

    // Multi-element case: each element is one item
    const out: string[] = [];
    matches.each((_, el) => {
      const $el = $(el);
      const text = $el.is("meta")
        ? ($el.attr("content") || "").trim()
        : $el.text().trim().replace(/\s+/g, " ");
      if (text) out.push(text);
    });
    return out;
  };

  const propDuration = (name: string): string => {
    const el = root.find(`[itemprop="${name}"]`).first();
    if (el.length === 0) return "";
    const iso = el.attr("datetime") || el.attr("content");
    if (iso && /^PT/.test(iso)) return parseIsoDuration(iso);
    return el.text().trim();
  };

  const title = propText("name");
  const ingredients = propTexts("recipeIngredient");
  const instructions = propTexts("recipeInstructions");

  // Require core recipe fields, otherwise let caller fall through to meta
  if (!title || ingredients.length === 0 || instructions.length === 0) return null;

  const tagSet = new Set<string>();
  for (const raw of [propText("keywords"), propText("recipeCategory")]) {
    raw
      .split(/[,;]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .forEach((t) => tagSet.add(t));
  }

  const yieldStr = propText("recipeYield");
  const yieldMatch = yieldStr.match(/(\d+)/);
  const servings = yieldMatch ? parseInt(yieldMatch[1], 10) : null;

  const description =
    propText("description") || $('meta[property="og:description"]').attr("content") || "";
  // Prefer og:image — typically a high-res social-sharing image — over the
  // inline <img itemprop="image">, which is often a small thumbnail.
  const imageUrl =
    $('meta[property="og:image"]').attr("content") || propText("image") || undefined;

  const recipe: Partial<Recipe> = {
    slug: slugify(title),
    title,
    description: description || undefined,
    tags: Array.from(tagSet),
    prepTime: propDuration("prepTime") || undefined,
    cookTime: propDuration("cookTime") || undefined,
    servings,
    ingredients,
    instructions,
    dateAdded: new Date().toISOString().split("T")[0],
  };

  return { recipe, imageUrl };
}

export async function scrapeRecipeFromUrl(url: string): Promise<ScrapeResult> {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const jsonLd = extractJsonLdRecipe(html);

  if (!jsonLd) {
    const microdata = extractMicrodataRecipe(html);
    if (microdata) return microdata;
    return extractMetaFallback(html);
  }

  const title = String(jsonLd.name || "");
  const recipe: Partial<Recipe> = {
    slug: slugify(title),
    title,
    description: jsonLd.description ? String(jsonLd.description) : undefined,
    tags: extractTags(jsonLd),
    source: url,
    prepTime: jsonLd.prepTime ? parseIsoDuration(String(jsonLd.prepTime)) : undefined,
    cookTime: jsonLd.cookTime ? parseIsoDuration(String(jsonLd.cookTime)) : undefined,
    servings: parseServings(jsonLd.recipeYield),
    ingredients: Array.isArray(jsonLd.recipeIngredient)
      ? jsonLd.recipeIngredient.map((i: unknown) => String(i).trim())
      : [],
    instructions: extractInstructions(jsonLd.recipeInstructions),
    dateAdded: new Date().toISOString().split("T")[0],
  };

  const imageUrl = extractImageUrl(jsonLd.image);

  return { recipe, imageUrl };
}
