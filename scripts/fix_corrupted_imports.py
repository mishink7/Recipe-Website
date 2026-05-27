r"""
Surgically fix recipes that were corrupted by the old import_recipes.py regex bugs.

Two classes of corruption being repaired:

1. Ingredient fractions with the leading digit eaten:
     "/2 lb shrimp"   -> "1/2 lb shrimp"
     "/4 tsp salt"    -> "1/4 tsp salt"
   The old `re.sub(r"^[\-\*\•\d\.]+\s*", ...)` stripped any leading digit. For
   "1/2" only the "1" was eaten (the slash blocked further matching), leaving
   "/2". For "1 cup" the "1 " was eaten entirely — that case is irrecoverable
   because the quantity is gone, so we don't touch it here.

   We assume "1" as the missing numerator. Almost all common fractions in
   recipes are 1/2, 1/3, 1/4, 1/8. A handful of legitimate 2/3 or 3/4 entries
   may need a manual touch-up afterwards — those are flagged in the output.

2. prepTime / cookTime fields containing instruction-like prose instead of a
   time value (e.g. prepTime "eration for protein", cookTime "ing the curry").
   These came from the old regex matching "preparation" as "prep" + capture
   group. Real time values always start with a digit; anything that doesn't
   start with a digit is corrupted and gets nulled.

Usage:
    python scripts/fix_corrupted_imports.py [--dry-run]
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECIPES_JSON = ROOT / "src" / "data" / "recipes.json"


def fix_ingredient(ing: str) -> tuple[str, bool]:
    """Return (fixed_ingredient, was_changed)."""
    # Match a leading "/N" where N is a single digit, followed by a space or
    # another non-digit (covers "/2 cup", "/4tsp", "/3  cup", etc.).
    if re.match(r"^/\d(?!\d)", ing):
        return "1" + ing, True
    return ing, False


def looks_like_time(value: str) -> bool:
    """A real time value starts with a digit (e.g. '10 min', '1 hour 30')."""
    return bool(re.match(r"^\s*\d", value))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Print changes without writing to disk")
    args = parser.parse_args()

    with open(RECIPES_JSON, "r", encoding="utf-8") as f:
        recipes = json.load(f)

    ingredient_fixes = 0
    ambiguous_fractions: list[tuple[str, str]] = []  # (slug, ingredient)
    prep_nulled = 0
    cook_nulled = 0
    affected_recipes: set[str] = set()

    for recipe in recipes:
        slug = recipe.get("slug", "<no-slug>")

        # Fix ingredient fractions
        for i, ing in enumerate(recipe.get("ingredients", [])):
            fixed, changed = fix_ingredient(ing)
            if changed:
                recipe["ingredients"][i] = fixed
                ingredient_fixes += 1
                affected_recipes.add(slug)
                # Flag /3 and /4 since they could legitimately be 2/3 or 3/4
                if re.match(r"^1/[34](?!\d)", fixed):
                    ambiguous_fractions.append((slug, fixed))

        # Null out bogus prepTime
        prep = recipe.get("prepTime")
        if prep and not looks_like_time(prep):
            recipe["prepTime"] = None
            prep_nulled += 1
            affected_recipes.add(slug)

        # Null out bogus cookTime
        cook = recipe.get("cookTime")
        if cook and not looks_like_time(cook):
            recipe["cookTime"] = None
            cook_nulled += 1
            affected_recipes.add(slug)

    print(f"Ingredient fractions repaired: {ingredient_fixes}")
    print(f"prepTime values nulled:        {prep_nulled}")
    print(f"cookTime values nulled:        {cook_nulled}")
    print(f"Recipes affected:              {len(affected_recipes)}")

    if ambiguous_fractions:
        print(f"\nAssumed '1/' for {len(ambiguous_fractions)} fraction(s) with "
              f"/3 or /4 denominators — review and correct any that should be "
              f"2/3 or 3/4:")
        for slug, ing in ambiguous_fractions:
            print(f"  {slug}: {ing}")

    if args.dry_run:
        print("\n(dry run — no file written)")
        return 0

    with open(RECIPES_JSON, "w", encoding="utf-8") as f:
        json.dump(recipes, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"\nWrote {RECIPES_JSON}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
