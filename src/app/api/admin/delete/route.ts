import { NextRequest, NextResponse } from "next/server";
import { collectTags } from "@/lib/recipe-utils";
import { commitRecipeChanges } from "@/lib/github";
import { getAllRecipes } from "@/lib/recipes";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) return unauthorized();

  try {
    const { slug } = await request.json();
    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    const currentRecipes = getAllRecipes();
    const recipe = currentRecipes.find((r) => r.slug === slug);
    if (!recipe) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const updatedRecipes = currentRecipes.filter((r) => r.slug !== slug);
    const updatedTags = collectTags(updatedRecipes);

    const { commitSha } = await commitRecipeChanges(
      updatedRecipes,
      updatedTags,
      null,
      `Delete recipe: ${recipe.title}`
    );

    return NextResponse.json({
      success: true,
      commitSha,
      message: `Recipe "${recipe.title}" deleted. Site will redeploy shortly.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
