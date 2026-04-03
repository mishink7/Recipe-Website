import { NextRequest, NextResponse } from "next/server";
import { scrapeRecipeFromUrl } from "@/lib/scrape-recipe";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function scrapeWithPython(url: string): Promise<Record<string, unknown> | null> {
  try {
    // Try 'py' (Windows) then 'python3' then 'python'
    const pythonCommands = ["py", "python3", "python"];
    const scriptPath = "scripts/scrape_recipe.py";

    for (const cmd of pythonCommands) {
      try {
        const { stdout } = await execFileAsync(cmd, [scriptPath, url], {
          timeout: 30000,
        });
        const data = JSON.parse(stdout);
        if (data.error) return null;
        return data;
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const password = request.headers.get("x-admin-password");
  if (password !== process.env.ADMIN_PASSWORD) return unauthorized();

  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Try Python recipe-scrapers first (supports 630+ sites)
    const pythonResult = await scrapeWithPython(url);
    if (pythonResult) {
      return NextResponse.json(pythonResult);
    }

    // Fallback to cheerio-based scraper
    const result = await scrapeRecipeFromUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scraping failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
