export interface Recipe {
  slug: string;
  title: string;
  description?: string | null;
  tags: string[];
  image?: string | null;
  source?: string | null;
  prepTime?: string | null;
  cookTime?: string | null;
  servings?: number | null;
  ingredients: string[];
  instructions: string[];
  notes?: string | null;
  dateAdded: string;
}
