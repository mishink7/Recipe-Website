export interface Recipe {
  slug: string;
  title: string;
  description?: string;
  tags: string[];
  image?: string;
  source?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  notes?: string;
  dateAdded: string;
}
