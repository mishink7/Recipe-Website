# Agent Instructions

> This file is mirrored across CLAUDE.md, AGENTS.md, and GEMINI.md so the same instructions load in any AI environment.

You are building a personal recipe web app that replaces a Google Drive-based recipe collection. The goal: a fast, filterable, visually appealing recipe browser — inspired by [deniszholob.com/recipes](https://deniszholob.com/recipes) but improved.

## Tech Stack

- **Framework:** Next.js (React) with App Router
- **Styling:** Tailwind CSS
- **Language:** TypeScript
- **Data:** JSON/Markdown files for recipe content (static, no database)
- **Deployment:** Vercel or Netlify (static/SSG)
- **Package Manager:** npm

## The 3-Layer Architecture

LLMs are probabilistic; most build/data tasks are deterministic. This system separates concerns to maximize reliability.

**Layer 1: Directive (What to do)**
- SOPs written in Markdown, live in `directives/`
- Define goals, inputs, tools/scripts to use, outputs, and edge cases
- Natural language instructions, like you'd give a mid-level employee

**Layer 2: Orchestration (Decision making)**
- This is you. Your job: intelligent routing.
- Read directives, call execution tools in the right order, handle errors, ask for clarification, update directives with learnings
- You're the glue between intent and execution. E.g. you don't manually parse Google Drive exports yourself — you read `directives/import_recipes.md` and then run `scripts/import_recipes.py`

**Layer 3: Execution (Doing the work)**
- Deterministic scripts in `scripts/`
- Environment variables, API tokens, etc. stored in `.env`
- Handle data import, image processing, recipe parsing, content generation
- Reliable, testable, fast. Use scripts instead of manual work. Commented well.

**Why this works:** if you do everything yourself, errors compound. 90% accuracy per step = 59% success over 5 steps. Push complexity into deterministic code. Focus on decision-making.

## Operating Principles

**1. Check for tools first**
Before writing a script, check `scripts/` per your directive. Only create new scripts if none exist.

**2. Self-anneal when things break**
- Read error message and stack trace
- Fix the script and test it again
- Update the directive with what you learned
- Example: Google Drive export format changes → update parser → test → update directive

**3. Update directives as you learn**
Directives are living documents. When you discover format quirks, better approaches, common errors, or edge cases — update the directive. But don't create or overwrite directives without asking unless explicitly told to.

**4. Respect the frontend**
- All UI changes go through React components and Tailwind — never inline styles or raw CSS unless Tailwind can't handle it
- Components live in `src/components/`, pages in `src/app/`
- Keep components small and composable
- Mobile-first responsive design

## Important: Next.js Agent Rules

<!-- BEGIN:nextjs-agent-rules -->
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Self-Annealing Loop

Errors are learning opportunities. When something breaks:
1. Fix it
2. Update the tool
3. Test tool, make sure it works
4. Update directive to include new flow
5. System is now stronger

## File Organization

**Directory structure:**
```
Recipe-Website/
├── CLAUDE.md                  # This file
├── AGENTS.md                  # Next.js agent rules
├── directives/                # SOPs in Markdown (instruction set)
│   ├── import_recipes.md      # How to import from Google Drive
│   ├── add_recipe.md          # How to add a single recipe
│   └── ...
├── scripts/                   # Deterministic Python/Node scripts
│   ├── import_recipes.py      # Google Drive → local recipe data
│   ├── process_images.py      # Optimize recipe images
│   └── ...
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── page.tsx           # Homepage / recipe grid
│   │   ├── recipe/[slug]/     # Individual recipe pages
│   │   └── layout.tsx         # Root layout
│   ├── components/            # Reusable React components
│   │   ├── RecipeCard.tsx
│   │   ├── RecipeGrid.tsx
│   │   ├── TagFilter.tsx
│   │   ├── SearchBar.tsx
│   │   └── ...
│   ├── data/                  # Recipe content
│   │   ├── recipes.json       # Recipe metadata + content
│   │   └── tags.json          # Tag definitions
│   ├── lib/                   # Utility functions
│   │   └── recipes.ts         # Recipe data loading/filtering helpers
│   └── types/                 # TypeScript type definitions
│       └── recipe.ts
├── public/
│   └── images/recipes/        # Recipe photos
├── .env                       # Environment variables (Google API keys, etc.)
├── .tmp/                      # Intermediate files (never commit)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

**Key principle:** Recipe data lives in `src/data/` as static JSON/Markdown. Import scripts in `scripts/` handle the one-time (or periodic) migration from Google Drive. The Next.js app reads the static data at build time.

## Recipe Data Model

Each recipe should have at minimum:
```typescript
interface Recipe {
  slug: string;           // URL-friendly identifier
  title: string;
  description?: string;   // Short summary
  tags: string[];         // e.g. ["chicken", "oven", "dinner"]
  image?: string;         // Path to recipe photo
  source?: string;        // Original source URL or "family recipe"
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  notes?: string;
  dateAdded: string;      // ISO date
}
```

## UI Requirements (Inspired by deniszholob.com/recipes)

**Core features:**
- Recipe card grid with photos, title overlay, and tag pills
- Search bar (filters titles, tags, and notes)
- Tag-based filtering with AND/OR/SINGLE toggle modes
- Dynamic result count ("Showing X of Y recipes")
- Individual recipe detail pages with full instructions
- Mobile-responsive layout

**Improvements over the inspiration site:**
- Light/dark mode toggle (default to user preference)
- Sort options (alphabetical, date added, prep time)
- Category grouping option (not just flat tags)
- Better mobile experience
- Print-friendly recipe view
- Quick "scale recipe" servings adjuster on detail pages

## Google Drive Import

Recipes currently live in Google Drive. The import process should:
1. Connect to Google Drive API (credentials in `.env`)
2. Pull recipe documents from a specified folder
3. Parse content into the Recipe data model
4. Download associated images
5. Output to `src/data/recipes.json` and `public/images/recipes/`

This is a `scripts/` + `directives/` task — NOT a manual copy-paste job.

## Summary

You sit between human intent (directives) and deterministic execution (scripts). Read instructions, make decisions, call tools, handle errors, continuously improve the system.

The webapp itself is a Next.js static site: fast, simple, no database. All the complexity of data import lives in scripts. The frontend is clean React + Tailwind.

Be pragmatic. Be reliable. Self-anneal.
