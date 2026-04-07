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

    // Try 1: Local Python recipe-scrapers (works in dev)
    const pythonResult = await scrapeWithPython(url);
    if (pythonResult) {
      return NextResponse.json(pythonResult);
    }

    // Try 2: Vercel Python function (works in production)
    try {
      const origin = request.headers.get("origin") || request.headers.get("host");
      const protocol = origin?.startsWith("localhost") ? "http" : "https";
      const base = `${protocol}://${origin}`;
      const pyRes = await fetch(`${base}/api/scrape-recipe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password || "",
        },
        body: JSON.stringify({ url }),
      });
      if (pyRes.ok) {
        const data = await pyRes.json();
        if (data.recipe) return NextResponse.json(data);
      }
    } catch {
      // Vercel Python function not available, continue to cheerio
    }

    // Try 3: Cheerio-based scraper (fallback)
    const result = await scrapeRecipeFromUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scraping failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
