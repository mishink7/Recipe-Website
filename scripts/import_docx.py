"""
One-off importer for the 5 .docx recipes that the main Google Drive
importer silently skipped (it only handles native Google Docs).

For each Drive file ID listed below:
  1. Download the .docx via Drive API.
  2. Use python-docx to extract paragraph text + embedded images.
  3. Save the first image to public/images/recipes/<slug>.<ext>.
  4. Reuse parse_recipe() from import_recipes.py to build the Recipe entry.
  5. Skip if slug already exists in recipes.json; otherwise append.
  6. Sort alphabetically and write recipes.json back.

Usage:
    python scripts/import_docx.py
"""

import io
import json
import sys
from pathlib import Path

# Reuse helpers from the existing importer
SCRIPTS_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPTS_DIR))
import import_recipes  # type: ignore  # noqa: E402
from import_recipes import (  # type: ignore  # noqa: E402
    parse_recipe,
    slugify,
    get_credentials,
    OUTPUT_FILE,
    IMAGES_DIR,
)

# Credentials live in the main repo, not the worktree. Override the
# paths inside import_recipes so its get_credentials() picks them up.
MAIN_REPO = Path("C:/Users/mishi/Desktop/Projects/Recipe-Website")
if (MAIN_REPO / "credentials.json").exists():
    import_recipes.CREDENTIALS_FILE = MAIN_REPO / "credentials.json"
if (MAIN_REPO / "token.json").exists():
    import_recipes.TOKEN_FILE = MAIN_REPO / "token.json"

from googleapiclient.discovery import build  # noqa: E402
from googleapiclient.http import MediaIoBaseDownload  # noqa: E402
from docx import Document  # noqa: E402

# Files to import: (drive_file_id, doc_name_without_extension, folder_tags)
DOCX_FILES = [
    ("1Ov09BrOL3VqnRpxdRSljPNV2XaMdIzAd", "Baked Gnocchi with Broccoli", ["main dishes, conventional"]),
    ("1o9eBCPAdt2iyWOVKLQHTLKJX46ZYwS4z", "Beef:Turkey and Cabbage Stir Fry", ["main dishes, conventional"]),
    ("1F_HVlfMPXPzQo0V8XkJXBrYyKKxUH0A1", "Chicken Piccata with Angel Hair Pasta", ["main dishes, conventional"]),
    ("1jz1tFBtcLtMTl-Toht3eOntP2olck9KX", "Linguica, Kale and Red Bean Soup", ["main dishes, conventional"]),
    ("1uK0GUj4zHe2hrCwx8QqjKABOsLUwEjBp", "Zucchini Lasagna", ["main dishes, conventional"]),
]


def download_docx(drive_service, file_id):
    """Download a .docx file from Drive into a BytesIO buffer."""
    request = drive_service.files().get_media(fileId=file_id)
    buf = io.BytesIO()
    downloader = MediaIoBaseDownload(buf, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    buf.seek(0)
    return buf


def extract_text(docx_doc):
    """Concatenate paragraph text in document order."""
    return "\n".join(p.text for p in docx_doc.paragraphs)


def extract_first_image(docx_doc, slug):
    """Save the first embedded image to IMAGES_DIR. Returns relative path or None."""
    for rel in docx_doc.part.rels.values():
        if "image" not in rel.target_ref:
            continue
        image_part = rel.target_part
        content_type = image_part.content_type  # e.g. "image/jpeg"
        if content_type == "image/jpeg":
            ext = "jpg"
        elif content_type == "image/png":
            ext = "png"
        elif content_type == "image/webp":
            ext = "webp"
        elif content_type == "image/gif":
            ext = "gif"
        else:
            ext = "jpg"

        IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        out_path = IMAGES_DIR / f"{slug}.{ext}"
        with open(out_path, "wb") as f:
            f.write(image_part.blob)
        return f"/images/recipes/{slug}.{ext}"
    return None


def main():
    print("=== .docx Recipe Importer ===\n")

    creds = get_credentials()
    drive_service = build("drive", "v3", credentials=creds)

    # Load existing
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        recipes = json.load(f)
    existing_slugs = {r["slug"] for r in recipes}
    print(f"Loaded {len(recipes)} existing recipes.\n")

    added = 0
    skipped = 0

    for file_id, name, folder_tags in DOCX_FILES:
        slug = slugify(name)
        print(f"  Processing: {name}")

        if slug in existing_slugs:
            print(f"    Skip (slug already exists: {slug})")
            skipped += 1
            continue

        # Download
        buf = download_docx(drive_service, file_id)
        docx_doc = Document(buf)
        text = extract_text(docx_doc)

        # Parse into recipe dict using shared parser
        recipe = parse_recipe(name, text, folder_tags)

        # Override source so it's distinguishable from Google Docs imports
        recipe["source"] = "Google Drive import (.docx)"

        # Try to extract an embedded image
        image_path = extract_first_image(docx_doc, recipe["slug"])
        if image_path:
            recipe["image"] = image_path
            print(f"    Image: {image_path}")

        recipes.append(recipe)
        existing_slugs.add(slug)
        added += 1
        print(f"    Added: {recipe['slug']} ({len(recipe['ingredients'])} ing, {len(recipe['instructions'])} steps)")

    # Sort alphabetically by title (case-insensitive) to match existing convention
    recipes.sort(key=lambda r: r["title"].lower())

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)

    print(f"\nDone. Added {added}, skipped {skipped}.")
    print(f"Total recipes: {len(recipes)}")


if __name__ == "__main__":
    main()
