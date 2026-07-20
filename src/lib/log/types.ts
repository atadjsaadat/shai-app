export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'hydration';

export interface ParsedFoodItem {
  food_name: string;
  serving_size_description: string | null;
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  confidence_score: number;
}

export interface LogMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
}

export interface ParseApiRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  mealType: MealType;
}

export interface ParseApiResponse {
  message: string;
  foodItems: ParsedFoodItem[];
  clarifyingQuestion: string | null;
  mealType: MealType;
  isHardFoodDay: boolean;
  complete: boolean;
}
