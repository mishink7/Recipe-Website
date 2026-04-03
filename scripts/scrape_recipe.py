#!/usr/bin/env python3
"""
Scrape a recipe from a URL using recipe-scrapers.
Outputs JSON to stdout matching the Recipe data model.

Usage: py scripts/scrape_recipe.py <url>
"""

import json
import sys
import re


def parse_servings(yields_str):
    """Extract integer servings from yield string like '4 servings' or '12'."""
    if not yields_str:
        return None
    match = re.search(r"(\d+)", str(yields_str))
    return int(match.group(1)) if match else None


def slugify(text):
    """Convert text to URL-friendly slug."""
    slug = text.lower()
    slug = re.sub(r"['']", "", slug)
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug


def format_time(minutes):
    """Convert minutes (int) to human-readable string."""
    if not minutes:
        return None
    try:
        mins = int(minutes)
    except (ValueError, TypeError):
        return str(minutes)
    if mins >= 60:
        hours = mins // 60
        remaining = mins % 60
        if remaining:
            return f"{hours} hr {remaining} min"
        return f"{hours} hr"
    return f"{mins} min"


def scrape(url):
    from recipe_scrapers import scrape_me

    scraper = scrape_me(url)

    title = scraper.title() or ""
    ingredients = scraper.ingredients() or []
    instructions_text = scraper.instructions() or ""

    # Split instructions into steps (recipe-scrapers returns a single string)
    instructions = [
        step.strip()
        for step in instructions_text.split("\n")
        if step.strip()
    ]

    result = {
        "recipe": {
            "slug": slugify(title),
            "title": title,
            "description": getattr(scraper, "description", lambda: None)(),
            "tags": [],
            "source": url,
            "prepTime": format_time(scraper.prep_time()),
            "cookTime": format_time(scraper.cook_time()),
            "servings": parse_servings(scraper.yields()),
            "ingredients": ingredients,
            "instructions": instructions,
            "dateAdded": None,
        },
        "imageUrl": scraper.image() or None,
    }

    # Try to get category/keywords for tags
    try:
        category = scraper.category()
        if category:
            result["recipe"]["tags"].append(category.strip().lower())
    except Exception:
        pass

    try:
        keywords = scraper.keywords()
        if keywords:
            if isinstance(keywords, str):
                result["recipe"]["tags"].extend(
                    k.strip().lower() for k in re.split(r"[,;]+", keywords) if k.strip()
                )
            elif isinstance(keywords, list):
                result["recipe"]["tags"].extend(
                    k.strip().lower() for k in keywords if k.strip()
                )
    except Exception:
        pass

    # Deduplicate tags
    result["recipe"]["tags"] = list(dict.fromkeys(result["recipe"]["tags"]))

    return result


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: scrape_recipe.py <url>"}), file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]
    try:
        data = scrape(url)
        print(json.dumps(data))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
