import { NextRequest, NextResponse } from "next/server";
import { validateRecipe, addRecipeToCollection, collectTags } from "@/lib/recipe-utils";
import { commitRecipeChanges, commitFile } from "@/lib/github";
import { getAllRecipes } from "@/lib/recipes";
import featuredData from "@/data/featured.json";
import type { FeaturedRecipe } from "@/types/recipe";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) return unauthorized();

  try {
    const featured = featuredData as FeaturedRecipe | null;
    if (!featured || !featured.recipe) {
      return NextResponse.json({ error: "No featured recipe available" }, { status: 400 });
    }

    if (featured.added) {
      return NextResponse.json({ error: "Recipe already added" }, { status: 400 });
    }

    // Validate the featured recipe
    const validation = validateRecipe(featured.recipe);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", errors: validation.errors },
        { status: 400 }
      );
    }

    const recipe = validation.recipe;

    // Download image if available
    let imageFile: { filename: string; base64: string } | null = null;
    if (featured.imageUrl) {
      try {
        const imgResponse = await fetch(featured.imageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
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
        // Image download failed — save without image
      }
    }

    // Add to recipe collection
    const currentRecipes = getAllRecipes();
    const { recipes: updatedRecipes } = addRecipeToCollection(currentRecipes, recipe);
    const updatedTags = collectTags(updatedRecipes);

    // Commit recipes + tags + image
    await commitRecipeChanges(
      updatedRecipes,
      updatedTags,
      imageFile,
      `Add featured recipe: ${recipe.title}`
    );

    // Mark featured as added
    const updatedFeatured: FeaturedRecipe = { ...featured, added: true };
    await commitFile(
      "src/data/featured.json",
      JSON.stringify(updatedFeatured, null, 2) + "\n",
      `Mark featured recipe as added: ${recipe.title}`
    );

    return NextResponse.json({
      success: true,
      slug: recipe.slug,
      message: `Recipe "${recipe.title}" added to collection. Site will redeploy shortly.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Add failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
