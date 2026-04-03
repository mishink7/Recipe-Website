import { NextRequest, NextResponse } from "next/server";
import { getRecipeBySlug } from "@/lib/recipes";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) return unauthorized();

  const { slug } = await params;
  const recipe = getRecipeBySlug(slug);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  return NextResponse.json(recipe);
}
