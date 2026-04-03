import { NextRequest, NextResponse } from "next/server";
import type { Recipe } from "@/types/recipe";
import { validateRecipe, addRecipeToCollection, collectTags } from "@/lib/recipe-utils";
import { commitRecipeChanges } from "@/lib/github";
import { getAllRecipes } from "@/lib/recipes";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) return unauthorized();

  try {
    const body = await request.json();
    const { recipeData, imageUrl, imageBase64, editSlug } = body;

    // Validate the recipe
    const validation = validateRecipe(recipeData);
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const recipe = validation.recipe;

    // Handle image: either from URL or base64 upload
    let imageFile: { filename: string; base64: string } | null = null;

    if (imageBase64) {
      // Direct upload — already base64
      imageFile = { filename: `${recipe.slug}.jpg`, base64: imageBase64 };
      recipe.image = `/images/recipes/${recipe.slug}.jpg`;
    } else if (imageUrl) {
      // Download from scraped URL
      try {
        const imgResponse = await fetch(imageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        if (imgResponse.ok) {
          const buffer = await imgResponse.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
          imageFile = { filename: `${recipe.slug}.${ext}`, base64 };
          recipe.image = `/images/recipes/${recipe.slug}.${ext}`;
        }
      } catch {
        // Image download failed — save recipe without image
      }
    }

    // Add or update collection
    const currentRecipes = getAllRecipes();
    let updatedRecipes: typeof currentRecipes;

    if (editSlug) {
      // Editing existing recipe — preserve original slug and dateAdded
      const existingIndex = currentRecipes.findIndex((r) => r.slug === editSlug);
      if (existingIndex === -1) {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
      }
      const existing = currentRecipes[existingIndex];
      recipe.slug = existing.slug;
      recipe.dateAdded = existing.dateAdded;
      if (!recipe.image && existing.image) recipe.image = existing.image;
      updatedRecipes = [...currentRecipes];
      updatedRecipes[existingIndex] = recipe;
      updatedRecipes.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      const result = addRecipeToCollection(currentRecipes, recipe);
      updatedRecipes = result.recipes;
    }

    const updatedTags = collectTags(updatedRecipes);

    // Commit to GitHub
    const action = editSlug ? "Update" : "Add";
    const { commitSha } = await commitRecipeChanges(
      updatedRecipes, updatedTags, imageFile,
      `${action} recipe: ${recipe.title}`
    );

    return NextResponse.json({
      success: true,
      slug: recipe.slug,
      commitSha,
      message: `Recipe "${recipe.title}" saved. Site will redeploy shortly.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
