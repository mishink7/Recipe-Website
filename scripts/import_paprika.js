#!/usr/bin/env node

/**
 * Import recipes from a Paprika 3 export file (.paprikarecipes)
 *
 * Usage: node scripts/import_paprika.js [path-to-export]
 *   Default path: Recipe-Website.paprikarecipes in project root
 *
 * The .paprikarecipes format is a zip of individually gzipped JSON files.
 * Each entry contains recipe data including embedded photo_data (base64).
 *
 * Skips recipes whose slug already exists in recipes.json.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { execSync } = require("child_process");

// Paths
const PROJECT_ROOT = path.resolve(__dirname, "..");
const RECIPES_JSON = path.join(PROJECT_ROOT, "src", "data", "recipes.json");
const IMAGES_DIR = path.join(PROJECT_ROOT, "public", "images", "recipes");
const DEFAULT_EXPORT = path.join(PROJECT_ROOT, "Recipe-Website.paprikarecipes");

const exportPath = process.argv[2] || DEFAULT_EXPORT;

if (!fs.existsSync(exportPath)) {
  console.error(`Export file not found: ${exportPath}`);
  process.exit(1);
}

// --- Helpers ---

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function splitLines(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseServings(str) {
  if (!str) return null;
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

function paprikaDateToISO(dateStr) {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  // Format: "2025-08-23 14:52:28"
  return dateStr.split(" ")[0];
}

// --- Extract zip without external deps ---
// .paprikarecipes is a standard zip; we shell out to unzip into a temp dir

function extractPaprikaExport(zipPath) {
  const tmpDir = path.join(PROJECT_ROOT, ".tmp", "paprika_import");
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true });
  }
  fs.mkdirSync(tmpDir, { recursive: true });

  execSync(`unzip -o "${zipPath}" -d "${tmpDir}"`, { stdio: "pipe" });

  const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".paprikarecipe"));
  const recipes = [];

  for (const file of files) {
    const buf = fs.readFileSync(path.join(tmpDir, file));
    try {
      const json = JSON.parse(zlib.gunzipSync(buf).toString("utf-8"));
      recipes.push(json);
    } catch (e) {
      console.warn(`  Skipping ${file}: failed to parse (${e.message})`);
    }
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true });
  return recipes;
}

// --- Convert a Paprika recipe to our data model ---

function convertRecipe(paprika) {
  const slug = slugify(paprika.name);
  const tags = (paprika.categories || []).map((c) => c.trim().toLowerCase()).filter(Boolean);
  const source = paprika.source_url || paprika.source || null;

  // Save embedded photo if available
  let imagePath = null;
  if (paprika.photo_data) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    const ext = "jpg"; // Paprika typically stores JPEG
    const imgFile = `${slug}.${ext}`;
    const imgDest = path.join(IMAGES_DIR, imgFile);
    fs.writeFileSync(imgDest, Buffer.from(paprika.photo_data, "base64"));
    imagePath = `/images/recipes/${imgFile}`;
  }

  return {
    slug,
    title: paprika.name,
    description: paprika.description || null,
    tags,
    image: imagePath,
    source,
    prepTime: paprika.prep_time || null,
    cookTime: paprika.cook_time || null,
    servings: parseServings(paprika.servings),
    ingredients: splitLines(paprika.ingredients),
    instructions: splitLines(paprika.directions),
    notes: paprika.notes || null,
    dateAdded: paprikaDateToISO(paprika.created),
  };
}

// --- Main ---

console.log(`Reading Paprika export: ${exportPath}`);
const paprikaRecipes = extractPaprikaExport(exportPath);
console.log(`Found ${paprikaRecipes.length} recipes in export`);

// Load existing recipes
const existing = JSON.parse(fs.readFileSync(RECIPES_JSON, "utf-8"));
const existingSlugs = new Set(existing.map((r) => r.slug));
console.log(`Existing recipes: ${existing.length}`);

let added = 0;
let skipped = 0;

for (const paprika of paprikaRecipes) {
  const slug = slugify(paprika.name);

  if (existingSlugs.has(slug)) {
    console.log(`  Skip (duplicate): ${paprika.name}`);
    skipped++;
    continue;
  }

  const recipe = convertRecipe(paprika);
  existing.push(recipe);
  existingSlugs.add(slug);
  added++;
  console.log(`  Added: ${paprika.name}${recipe.image ? " (with image)" : ""}`);
}

// Sort alphabetically by title
existing.sort((a, b) => a.title.localeCompare(b.title));

// Write back
fs.writeFileSync(RECIPES_JSON, JSON.stringify(existing, null, 2) + "\n");

console.log(`\nDone! Added ${added}, skipped ${skipped} duplicates.`);
console.log(`Total recipes: ${existing.length}`);
