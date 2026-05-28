"""
Refresh all Google Drive-imported recipes by re-fetching from Drive and
re-parsing with the now-fixed parser. The original parser silently ate
leading digits ("1 Tbsp coconut" → "Tbsp coconut") and dumped cooking
steps into the ingredients array when the doc lacked an "Instructions"
header. Both bugs are fixed in scripts/import_recipes.py; this script
applies that fix to every existing Drive-sourced recipe.

What gets refreshed:
  - ingredients[]    (restores leading digits, no '/N' fractions)
  - instructions[]   (correctly split from ingredients)
  - prepTime / cookTime / description / notes / servings (only if
    currently null / placeholder — never clobbers existing user values)

What stays:
  - image (already downloaded; don't re-fetch)
  - dateAdded (preserve original add date)
  - tags (preserve)
  - source, slug, title
  - Non-Drive recipes (Paprika imports etc.) are skipped entirely
  - Section headers ('## ' prefix) — re-inserted for known recipes
    after merge via SECTION_PATCHES below

Usage:
  python scripts/refresh_from_drive.py [--dry-run]

Requires credentials.json and a valid token.json in the project root.
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from import_recipes import (  # noqa: E402
    get_credentials,
    walk_drive_folder,
    get_doc_content,
    parse_recipe,
)
from googleapiclient.discovery import build  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RECIPES_JSON = ROOT / "src" / "data" / "recipes.json"
FOLDER_ID = "11dRS2TGIVUW2CrvqRfDqa7IM0WydE9rj"
PLACEHOLDER = "(imported — check formatting)"

# Recipes that had user-inserted section headers ('## ' prefix) before the
# refresh. After we replace ingredients/instructions with fresh-parsed data,
# we put those headers back. The replacements happen by exact-text match
# against the freshly-parsed lines.
SECTION_PATCHES: dict[str, dict] = {
    "massaman-curry": {
        # Replace these lines in the freshly-parsed array with the marked-
        # header version (exact match on stripped text).
        "ingredient_replacements": {
            "PROTEIN OPTIONS optional": "## Protein options (optional)",
            "CURRY": "## Curry",
        },
        # The Drive doc has "PREPERATION FOR PROTEIN" as a section label
        # that the auto-split leaves stuck at the end of ingredients[].
        # Drop it — the equivalent header gets inserted into instructions[]
        # below.
        "ingredient_removals": ["PREPERATION FOR PROTEIN"],
        # Same idea: the doc's inline "COOKING THE CURRY" label ends up
        # between the protein notes and the cooking steps. Replace in place.
        "instruction_replacements": {
            "COOKING THE CURRY": "## Cooking the curry",
        },
        # Insert this header BEFORE the first instruction containing the
        # given anchor text. (The "Cooking the curry" header is handled by
        # the replacement above, so it's not in this list.)
        "instruction_insertions": [
            ("You have options for added protein", "## Preparations for protein"),
        ],
    },
    "coconut-chia-pudding-with-cantaloupe": {
        # The Drive doc has "Preparation (can do night before)" as a
        # section label that ends up stuck in ingredients. It's metadata,
        # not an ingredient — drop it.
        "ingredient_removals": ["Preparation (can do night before)"],
    },
}


def apply_section_patches(recipe: dict) -> None:
    """Re-insert user-customized section headers after a fresh parse."""
    patches = SECTION_PATCHES.get(recipe.get("slug"))
    if not patches:
        return

    # Replace in-place: line.strip() == old → new
    for old, new in patches.get("ingredient_replacements", {}).items():
        for i, line in enumerate(recipe["ingredients"]):
            if line.strip() == old:
                recipe["ingredients"][i] = new
                break
    for old, new in patches.get("instruction_replacements", {}).items():
        for i, line in enumerate(recipe["instructions"]):
            if line.strip() == old:
                recipe["instructions"][i] = new
                break

    # Drop lines that match any of the removal strings
    removals = set(patches.get("ingredient_removals", []))
    if removals:
        recipe["ingredients"] = [
            line for line in recipe["ingredients"] if line.strip() not in removals
        ]
    ins_removals = set(patches.get("instruction_removals", []))
    if ins_removals:
        recipe["instructions"] = [
            line for line in recipe["instructions"] if line.strip() not in ins_removals
        ]

    # Insert a header before the first instruction containing each anchor
    insertions = list(patches.get("instruction_insertions", []))
    if insertions:
        rebuilt: list[str] = []
        used: set[int] = set()
        for line in recipe["instructions"]:
            for j, (anchor, header) in enumerate(insertions):
                if j not in used and anchor in line:
                    rebuilt.append(header)
                    used.add(j)
                    break
            rebuilt.append(line)
        recipe["instructions"] = rebuilt


def merge_into_existing(existing: dict, fresh: dict) -> dict:
    """Merge a freshly-parsed recipe into the existing one. Always replaces
    ingredients[] and instructions[] (those are what we're fixing). Only
    fills time / description / notes / servings if they were null."""
    existing = dict(existing)  # shallow copy
    existing["ingredients"] = fresh["ingredients"]
    existing["instructions"] = fresh["instructions"]

    # Only fill in time/description/notes/servings if existing was null —
    # don't clobber a value the user already curated.
    for field in ("prepTime", "cookTime", "description", "notes", "servings"):
        if not existing.get(field) and fresh.get(field):
            existing[field] = fresh[field]

    return existing


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Print stats but don't write recipes.json")
    parser.add_argument("--limit", type=int, default=0,
                        help="Process only the first N Drive docs (debug)")
    args = parser.parse_args()

    print("Loading existing recipes...")
    with open(RECIPES_JSON, "r", encoding="utf-8") as f:
        recipes = json.load(f)
    by_slug = {r["slug"]: r for r in recipes}
    drive_count = sum(1 for r in recipes if r.get("source") == "Google Drive import")
    print(f"  {len(recipes)} total ({drive_count} from Drive)")

    print("Connecting to Drive...")
    creds = get_credentials()
    drive_service = build("drive", "v3", credentials=creds)
    docs_service = build("docs", "v1", credentials=creds)

    print(f"Walking folder {FOLDER_ID}...")
    doc_list = walk_drive_folder(drive_service, FOLDER_ID)
    print(f"  found {len(doc_list)} Google Docs")

    if args.limit:
        doc_list = doc_list[: args.limit]
        print(f"  (limited to first {args.limit} for this run)")

    updated = 0
    skipped_no_match = 0
    new_recipes = 0
    errors = 0
    changes_log: list[tuple[str, int, int]] = []

    for i, (doc_id, doc_name, folder_tags) in enumerate(doc_list):
        print(f"  [{i+1}/{len(doc_list)}] {doc_name}", end="")
        try:
            text, _image_urls = get_doc_content(docs_service, doc_id)
            fresh = parse_recipe(doc_name, text, folder_tags)

            slug = fresh["slug"]
            existing = by_slug.get(slug)

            if existing is None:
                # New doc added to Drive since the original import.
                # Append, mark as Drive import.
                fresh["source"] = "Google Drive import"
                recipes.append(fresh)
                by_slug[slug] = fresh
                new_recipes += 1
                print(f"  -> NEW recipe")
                continue

            if existing.get("source") != "Google Drive import":
                # Don't overwrite Paprika or other imports
                skipped_no_match += 1
                print(f"  -> skip (source={existing.get('source')})")
                continue

            old_ing = len(existing.get("ingredients", []))
            old_ins = len(existing.get("instructions", []))
            merged = merge_into_existing(existing, fresh)
            apply_section_patches(merged)

            # Replace in the list
            for idx, r in enumerate(recipes):
                if r is existing:
                    recipes[idx] = merged
                    break
            by_slug[slug] = merged

            updated += 1
            new_ing = len(merged["ingredients"])
            new_ins = len(merged["instructions"])
            changes_log.append((slug, new_ing - old_ing, new_ins - old_ins))
            print(f"  -> {new_ing} ingredients ({new_ing-old_ing:+}), "
                  f"{new_ins} instructions ({new_ins-old_ins:+})")
        except Exception as e:
            errors += 1
            print(f"  -> ERROR: {type(e).__name__}: {e}")

    print()
    print(f"Updated:  {updated}")
    print(f"New:      {new_recipes}")
    print(f"Skipped:  {skipped_no_match}")
    print(f"Errors:   {errors}")

    if args.dry_run:
        print("\n(dry run — no file written)")
        return 0

    # Sort alphabetically by title (matches import_recipes.py behavior)
    recipes.sort(key=lambda r: r["title"].lower())

    with open(RECIPES_JSON, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"\nWrote {RECIPES_JSON}")
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
