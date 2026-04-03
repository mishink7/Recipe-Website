import { NextRequest, NextResponse } from "next/server";
import { getAllRecipes, getAllTags } from "@/lib/recipes";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) return unauthorized();

  const recipes = getAllRecipes();
  const tags = getAllTags(recipes);
  return NextResponse.json(tags);
}
