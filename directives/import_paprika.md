# Import Recipes from Paprika 3

## Goal
Import recipes from a Paprika 3 export file (`.paprikarecipes`) into the recipe website.

## Prerequisites
- Paprika 3 export file (File → Export in Paprika app)
- Place the `.paprikarecipes` file in the project root

## Steps

1. Run the import script:
   ```bash
   node scripts/import_paprika.js [path-to-file]
   ```
   Default path: `Recipe-Website.paprikarecipes` in project root.

2. The script will:
   - Extract the zip archive (contains gzipped JSON per recipe)
   - Convert each recipe to our data model
   - Save embedded photos to `public/images/recipes/`
   - Skip recipes whose slug already exists in `recipes.json`
   - Merge new recipes and sort alphabetically
   - Write updated `src/data/recipes.json`

3. Build the site to verify: `npm run build`

## Field Mapping

| Paprika Field | Our Field | Notes |
|---|---|---|
| `name` | `title` + `slug` | slug is auto-generated |
| `ingredients` | `ingredients[]` | Split by newlines |
| `directions` | `instructions[]` | Split by newlines |
| `categories[]` | `tags[]` | Lowercased, trimmed |
| `prep_time` | `prepTime` | String as-is |
| `cook_time` | `cookTime` | String as-is |
| `servings` | `servings` | Parsed to integer |
| `source_url` / `source` | `source` | URL preferred over text |
| `photo_data` | `image` | Base64 → JPEG file |
| `created` | `dateAdded` | ISO date |
| `description` | `description` | As-is |
| `notes` | `notes` | As-is |

## Edge Cases
- Duplicate slugs are skipped (existing recipes kept)
- Recipes without `photo_data` get `image: null`
- `servings` string like "4 servings" is parsed to integer `4`
