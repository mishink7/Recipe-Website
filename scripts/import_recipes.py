"""
Import recipes from Google Drive into the Recipe Website.

Connects to Google Drive, reads all Google Docs from a specified folder
(including subfolders), parses them into the Recipe data model, and outputs
to src/data/recipes.json.

Subfolder names become tags on each recipe.

Usage:
    python scripts/import_recipes.py

First run will open a browser for Google OAuth authentication.
"""

import json
import os
import re
import sys
import requests as http_requests
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# Project root
ROOT = Path(__file__).resolve().parent.parent
CREDENTIALS_FILE = ROOT / "credentials.json"
TOKEN_FILE = ROOT / "token.json"
OUTPUT_FILE = ROOT / "src" / "data" / "recipes.json"
IMAGES_DIR = ROOT / "public" / "images" / "recipes"

# Google Drive folder ID (root recipe folder)
FOLDER_ID = "11dRS2TGIVUW2CrvqRfDqa7IM0WydE9rj"

# Scopes needed for reading Drive files and Docs content
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
]


def get_credentials():
    """Get or refresh Google OAuth credentials."""
    creds = None
    if TOKEN_FILE.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_FILE), SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception:
                # Token refresh failed, re-authenticate
                creds = None

        if not creds:
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_FILE), SCOPES)
            creds = flow.run_local_server(port=0)

        # Save token for future runs
        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return creds


def list_folder_contents(drive_service, folder_id):
    """List all files and subfolders in a Google Drive folder."""
    items = []
    page_token = None
    while True:
        results = drive_service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            fields="nextPageToken, files(id, name, mimeType)",
            pageToken=page_token,
            pageSize=100,
        ).execute()
        items.extend(results.get("files", []))
        page_token = results.get("nextPageToken")
        if not page_token:
            break
    return items


def walk_drive_folder(drive_service, folder_id, folder_path=None):
    """
    Recursively walk a Google Drive folder.
    Returns list of (doc_id, doc_name, folder_tags) tuples.
    folder_tags is a list of subfolder names in the path.
    """
    if folder_path is None:
        folder_path = []

    docs = []
    items = list_folder_contents(drive_service, folder_id)

    for item in items:
        if item["mimeType"] == "application/vnd.google-apps.folder":
            # Recurse into subfolder, adding folder name as a tag
            subfolder_tags = folder_path + [item["name"].lower().strip()]
            docs.extend(walk_drive_folder(drive_service, item["id"], subfolder_tags))
        elif item["mimeType"] == "application/vnd.google-apps.document":
            docs.append((item["id"], item["name"], folder_path))

    return docs


def get_doc_content(docs_service, doc_id):
    """Export a Google Doc as plain text and extract inline image URLs."""
    doc = docs_service.documents().get(documentId=doc_id).execute()
    text_parts = []
    image_urls = []

    # Collect inline object image URLs from the doc
    inline_objects = doc.get("inlineObjects", {})
    for obj_id, obj in inline_objects.items():
        embedded = obj.get("inlineObjectProperties", {}).get("embeddedObject", {})
        # Try contentUri first (directly accessible URL)
        uri = embedded.get("imageProperties", {}).get("contentUri")
        if uri:
            image_urls.append(uri)
        else:
            # Try sourceUri (external link)
            source_uri = embedded.get("imageProperties", {}).get("sourceUri")
            if source_uri:
                image_urls.append(source_uri)

    for element in doc.get("body", {}).get("content", []):
        paragraph = element.get("paragraph")
        if paragraph:
            for run in paragraph.get("elements", []):
                text_content = run.get("textRun", {}).get("content", "")
                text_parts.append(text_content)

    return "".join(text_parts), image_urls


def download_image(url, slug, creds):
    """Download an image and save it to public/images/recipes/. Returns the relative path or None."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Determine file extension from URL or default to .jpg
    ext = ".jpg"
    if ".png" in url.lower():
        ext = ".png"
    elif ".webp" in url.lower():
        ext = ".webp"

    filename = f"{slug}{ext}"
    filepath = IMAGES_DIR / filename

    try:
        # Use authenticated request for Google-hosted images
        headers = {"Authorization": f"Bearer {creds.token}"}
        resp = http_requests.get(url, headers=headers, timeout=30)

        if resp.status_code != 200:
            # Try without auth (external images)
            resp = http_requests.get(url, timeout=30)

        if resp.status_code == 200 and len(resp.content) > 1000:
            # Detect actual content type
            content_type = resp.headers.get("content-type", "")
            if "png" in content_type:
                ext = ".png"
            elif "webp" in content_type:
                ext = ".webp"
            elif "gif" in content_type:
                ext = ".gif"
            else:
                ext = ".jpg"

            filename = f"{slug}{ext}"
            filepath = IMAGES_DIR / filename

            with open(filepath, "wb") as f:
                f.write(resp.content)
            return f"/images/recipes/{filename}"
    except Exception as e:
        print(f" [img error: {e}]", end="")

    return None


def slugify(text):
    """Convert text to URL-friendly slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def parse_recipe(title, text, folder_tags):
    """
    Parse raw Google Doc text into a recipe dict.
    Tries to identify sections: ingredients, instructions, notes.
    """
    lines = [line.strip() for line in text.strip().split("\n")]
    # Remove empty lines at start/end, keep structure
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()

    # Try to find sections by common headings
    ingredients = []
    instructions = []
    notes = []
    description = ""
    prep_time = None
    cook_time = None
    servings = None

    current_section = "unknown"
    unknown_lines = []

    for line in lines:
        line_lower = line.lower()

        # Detect section headers
        if re.match(r"^(ingredients?):?$", line_lower):
            current_section = "ingredients"
            continue
        elif re.match(r"^(instructions?|directions?|steps?|method|preparation):?$", line_lower):
            current_section = "instructions"
            continue
        elif re.match(r"^(notes?|tips?):?$", line_lower):
            current_section = "notes"
            continue

        # Detect metadata inline
        prep_match = re.match(r"^prep\s*(?:time)?:?\s*(.+)$", line_lower)
        if prep_match:
            prep_time = prep_match.group(1).strip()
            continue

        cook_match = re.match(r"^cook\s*(?:time)?:?\s*(.+)$", line_lower)
        if cook_match:
            cook_time = cook_match.group(1).strip()
            continue

        total_match = re.match(r"^total\s*(?:time)?:?\s*(.+)$", line_lower)
        if total_match:
            # Use total time as cook time if no cook time specified
            if not cook_time:
                cook_time = total_match.group(1).strip()
            continue

        servings_match = re.match(r"^(?:servings?|serves?|yield):?\s*(.+)$", line_lower)
        if servings_match:
            s = servings_match.group(1).strip()
            num_match = re.search(r"(\d+)", s)
            if num_match:
                servings = int(num_match.group(1))
            continue

        if not line:
            continue

        # Add line to current section
        if current_section == "ingredients":
            # Clean up bullet points, dashes, numbers at start
            cleaned = re.sub(r"^[\-\*\•\d\.]+\s*", "", line).strip()
            if cleaned:
                ingredients.append(cleaned)
        elif current_section == "instructions":
            cleaned = re.sub(r"^[\d\.]+\s*", "", line).strip()
            if cleaned:
                instructions.append(cleaned)
        elif current_section == "notes":
            notes.append(line)
        else:
            unknown_lines.append(line)

    # If no sections were detected, try to split intelligently
    if not ingredients and not instructions and unknown_lines:
        # First non-title line might be description
        # Try to find a natural split point
        ingredients_start = None
        instructions_start = None

        for i, line in enumerate(unknown_lines):
            line_lower = line.lower()
            # Look for lines that look like ingredients (contain measurements)
            if re.search(r"\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|clove|inch)", line_lower):
                if ingredients_start is None:
                    ingredients_start = i

        if ingredients_start is not None:
            description = " ".join(unknown_lines[:ingredients_start]).strip()
            # Everything after ingredients_start: try to split ingredients from instructions
            remaining = unknown_lines[ingredients_start:]
            in_ingredients = True
            for line in remaining:
                # If line starts with a number and doesn't look like a measurement, it might be an instruction
                if in_ingredients and not re.search(r"\d+\s*(cup|tbsp|tsp|oz|lb|g|kg|ml|clove|inch)", line.lower()):
                    # Check if it looks like a sentence (longer, has verbs)
                    if len(line.split()) > 5:
                        in_ingredients = False

                if in_ingredients:
                    cleaned = re.sub(r"^[\-\*\•\d\.]+\s*", "", line).strip()
                    if cleaned:
                        ingredients.append(cleaned)
                else:
                    cleaned = re.sub(r"^[\d\.]+\s*", "", line).strip()
                    if cleaned:
                        instructions.append(cleaned)
        else:
            # Can't parse structure — put everything in instructions
            description = unknown_lines[0] if unknown_lines else ""
            instructions = unknown_lines[1:] if len(unknown_lines) > 1 else unknown_lines

    recipe = {
        "slug": slugify(title),
        "title": title.strip(),
        "description": description if description else None,
        "tags": list(set(folder_tags)),  # Deduplicate
        "image": None,
        "source": "Google Drive import",
        "prepTime": prep_time,
        "cookTime": cook_time,
        "servings": servings,
        "ingredients": ingredients if ingredients else ["(imported — check formatting)"],
        "instructions": instructions if instructions else ["(imported — check formatting)"],
        "notes": "\n".join(notes) if notes else None,
        "dateAdded": "2026-03-27",
    }

    return recipe


def main():
    print("=== Recipe Import from Google Drive ===\n")

    # Authenticate
    print("Authenticating with Google...")
    creds = get_credentials()
    drive_service = build("drive", "v3", credentials=creds)
    docs_service = build("docs", "v1", credentials=creds)
    print("Authenticated successfully.\n")

    # Walk the folder structure
    print(f"Scanning folder: {FOLDER_ID}")
    doc_list = walk_drive_folder(drive_service, FOLDER_ID)
    print(f"Found {len(doc_list)} Google Docs across all subfolders.\n")

    if not doc_list:
        print("No documents found. Check the folder ID and permissions.")
        sys.exit(1)

    # Print folder structure
    folders_seen = set()
    for _, _, tags in doc_list:
        if tags:
            folders_seen.add(" > ".join(tags))
    if folders_seen:
        print("Folder structure found:")
        for f in sorted(folders_seen):
            print(f"  - {f}")
        print()

    # Process each doc
    recipes = []
    errors = []
    images_found = 0
    images_downloaded = 0
    for i, (doc_id, doc_name, folder_tags) in enumerate(doc_list):
        print(f"  [{i+1}/{len(doc_list)}] Processing: {doc_name}", end="")
        try:
            text, image_urls = get_doc_content(docs_service, doc_id)
            recipe = parse_recipe(doc_name, text, folder_tags)

            # Download first image if available
            if image_urls:
                images_found += 1
                image_path = download_image(image_urls[0], recipe["slug"], creds)
                if image_path:
                    recipe["image"] = image_path
                    images_downloaded += 1
                    print(f" [img OK]", end="")

            recipes.append(recipe)
            ing_count = len(recipe["ingredients"])
            step_count = len(recipe["instructions"])
            print(f"  -> {ing_count} ingredients, {step_count} steps")
        except Exception as e:
            print(f"  -> ERROR: {e}")
            errors.append((doc_name, str(e)))

    print(f"\nProcessed {len(recipes)} recipes successfully.")
    print(f"Images: {images_found} found in docs, {images_downloaded} downloaded.")
    if errors:
        print(f"{len(errors)} errors:")
        for name, err in errors:
            print(f"  - {name}: {err}")

    # Sort recipes alphabetically
    recipes.sort(key=lambda r: r["title"].lower())

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)

    print(f"\nRecipes written to: {OUTPUT_FILE}")

    # Generate tags summary
    all_tags = set()
    for r in recipes:
        all_tags.update(r["tags"])
    tags_file = ROOT / "src" / "data" / "tags.json"
    with open(tags_file, "w", encoding="utf-8") as f:
        json.dump(sorted(all_tags), f, indent=2)
    print(f"Tags written to: {tags_file}")
    print(f"Unique tags: {sorted(all_tags)}")


if __name__ == "__main__":
    main()
