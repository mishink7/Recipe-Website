#!/usr/bin/env python3
"""
Find recipes with tiny thumbnail images (<15KB) and re-download
full-res images from the recipe source URL using recipe-scrapers.
"""

import json
import os
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
RECIPES_JSON = os.path.join(PROJECT_ROOT, "src", "data", "recipes.json")
IMAGES_DIR = os.path.join(PROJECT_ROOT, "public", "images", "recipes")
SIZE_THRESHOLD = 15000  # 15KB


def download_image(url, dest):
    """Download image with browser-like headers."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": url,
    })
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read()
        if len(data) < SIZE_THRESHOLD:
            return False, len(data)
        with open(dest, "wb") as f:
            f.write(data)
        return True, len(data)


def main():
    from recipe_scrapers import scrape_me

    with open(RECIPES_JSON, "r", encoding="utf-8") as f:
        recipes = json.load(f)

    fixed = 0
    failed = 0

    for recipe in recipes:
        if not recipe.get("image") or not recipe.get("source"):
            continue

        img_path = os.path.join(IMAGES_DIR, os.path.basename(recipe["image"]))
        if not os.path.exists(img_path):
            continue

        size = os.path.getsize(img_path)
        if size >= SIZE_THRESHOLD:
            continue

        slug = recipe["slug"]
        source = recipe["source"]
        print(f"\n{slug} ({size // 1024}KB)")
        print(f"  Source: {source}")

        try:
            scraper = scrape_me(source)
            image_url = scraper.image()
            if not image_url:
                print(f"  SKIP: No image URL found")
                failed += 1
                continue

            print(f"  Image URL: {image_url}")
            ok, new_size = download_image(image_url, img_path)
            if ok:
                print(f"  OK: Downloaded {new_size // 1024}KB")
                fixed += 1
            else:
                print(f"  SKIP: Downloaded image too small ({new_size // 1024}KB)")
                failed += 1
        except Exception as e:
            print(f"  FAIL: {e}")
            failed += 1

    print(f"\n--- Done: {fixed} fixed, {failed} failed ---")


if __name__ == "__main__":
    main()
