import { NextRequest, NextResponse } from "next/server";
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
    const { recipeData, imageUrl, imageBase64 } = body;

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

    // Add to collection
    const currentRecipes = getAllRecipes();
    const { recipes: updatedRecipes } = addRecipeToCollection(currentRecipes, recipe);
    const updatedTags = collectTags(updatedRecipes);

    // Commit to GitHub
    const { commitSha } = await commitRecipeChanges(updatedRecipes, updatedTags, imageFile);

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
