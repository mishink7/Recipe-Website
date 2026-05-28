r"""
Repair recipes that were corrupted by the old import_recipes.py regex bugs.

Three classes of corruption being repaired:

1. Ingredient fractions with the leading digit eaten:
     "/2 lb shrimp"   -> "1/2 lb shrimp"
     "/4 tsp salt"    -> "1/4 tsp salt"
   The old `re.sub(r"^[\-\*\•\d\.]+\s*", ...)` stripped any leading digit. For
   "1/2" only the "1" was eaten (the slash blocked further matching), leaving
   "/2". We restore the leading "1". Quantities lost as bare integers
   (e.g. "1 Tbsp" -> "Tbsp") are irrecoverable from the JSON alone.

2. prepTime / cookTime fields containing instruction-like prose instead of a
   time value (e.g. prepTime "eration for protein", cookTime "ing the curry").
   These came from the old regex matching "preparation" as "prep" + capture
   group. Real time values always start with a digit; anything that doesn't
   start with a digit is corrupted and gets nulled.

3. Five recipes have their cooking instructions dumped into the `ingredients`
   array because the original Google Doc had an "Ingredients" header but no
   "Instructions" header, so the section detector never switched back. The
   split points below were chosen by hand-reading each recipe. Each lists
   the first index in `ingredients` that is actually an instruction; that
   index and everything after gets moved to the `instructions` array
   (overwriting the "(imported — check formatting)" placeholder).

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

# slug -> first index in ingredients[] that is actually an instruction.
# Determined by manual inspection of each recipe.
SPLIT_POINTS = {
    "massaman-curry": 20,
    "coconut-chia-pudding-with-cantaloupe": 6,
    "greek-salad-dressing": 7,
    "tzatziki-sauce": 7,
    "pesto": 5,
}

PLACEHOLDER = "(imported — check formatting)"


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


def split_mixed_recipe(recipe: dict) -> bool:
    """For recipes with instructions dumped into ingredients, move the tail
    of ingredients[] into instructions[]. Returns True if changed."""
    slug = recipe.get("slug")
    if slug not in SPLIT_POINTS:
        return False

    split_idx = SPLIT_POINTS[slug]
    ingredients = recipe.get("ingredients", [])
    instructions = recipe.get("instructions", [])

    # Sanity check: instructions should currently be the placeholder, and
    # ingredients should be long enough to split.
    if len(ingredients) <= split_idx:
        print(f"  WARN {slug}: ingredients only has {len(ingredients)} items, "
              f"can't split at {split_idx}")
        return False
    if instructions != [PLACEHOLDER]:
        print(f"  WARN {slug}: instructions is not the placeholder "
              f"(found {instructions!r}); skipping split to avoid clobbering")
        return False

    real_ingredients = ingredients[:split_idx]
    new_instructions = ingredients[split_idx:]
    recipe["ingredients"] = real_ingredients
    recipe["instructions"] = new_instructions
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true",
                        help="Print changes without writing to disk")
    args = parser.parse_args()

    with open(RECIPES_JSON, "r", encoding="utf-8") as f:
        recipes = json.load(f)

    ingredient_fixes = 0
    ambiguous_fractions: list[tuple[str, str]] = []
    prep_nulled = 0
    cook_nulled = 0
    affected_recipes: set[str] = set()
    splits_applied: list[tuple[str, int, int]] = []  # (slug, n_ingredients, n_instructions)

    for recipe in recipes:
        slug = recipe.get("slug", "<no-slug>")

        # Fix 3 first (the structural split), so that the fraction fix below
        # also sees the new ingredients[] layout. Currently this doesn't
        # matter because the affected slugs' fractions are already in the
        # ingredient portion, but doing the split first is the safer order.
        if split_mixed_recipe(recipe):
            splits_applied.append(
                (slug, len(recipe["ingredients"]), len(recipe["instructions"]))
            )
            affected_recipes.add(slug)

        # Fix 1: ingredient fractions
        for i, ing in enumerate(recipe.get("ingredients", [])):
            fixed, changed = fix_ingredient(ing)
            if changed:
                recipe["ingredients"][i] = fixed
                ingredient_fixes += 1
                affected_recipes.add(slug)
                if re.match(r"^1/[34](?!\d)", fixed):
                    ambiguous_fractions.append((slug, fixed))

        # Fix 2: null bogus prepTime
        prep = recipe.get("prepTime")
        if prep and not looks_like_time(prep):
            recipe["prepTime"] = None
            prep_nulled += 1
            affected_recipes.add(slug)

        cook = recipe.get("cookTime")
        if cook and not looks_like_time(cook):
            recipe["cookTime"] = None
            cook_nulled += 1
            affected_recipes.add(slug)

    print(f"Ingredient fractions repaired: {ingredient_fixes}")
    print(f"prepTime values nulled:        {prep_nulled}")
    print(f"cookTime values nulled:        {cook_nulled}")
    print(f"Mixed-content recipes split:   {len(splits_applied)}")
    for slug, n_ing, n_ins in splits_applied:
        print(f"    {slug}: {n_ing} ingredients, {n_ins} instructions")
    print(f"Recipes affected total:        {len(affected_recipes)}")

    if ambiguous_fractions:
        print(f"\nAssumed '1/' for {len(ambiguous_fractions)} fraction(s) with "
              f"/3 or /4 denominators — review and correct any that should "
              f"be 2/3 or 3/4:")
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
