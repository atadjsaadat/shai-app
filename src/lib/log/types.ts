export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'hydration';

export interface ParsedFoodItem {
  food_name: string;
  serving_size_description: string | null;
  // Core macros
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  sugar_g: number | null;
  saturated_fat_g: number | null;
  sodium_mg: number | null;
  // Displayed micronutrients
  iron_mg: number | null;
  calcium_mg: number | null;
  vitamin_c_mg: number | null;
  vitamin_a_mcg: number | null;
  vitamin_d_mcg: number | null;
  zinc_mg: number | null;
  omega3_mg: number | null;
  // Shadow-logged micronutrients (captured, not yet displayed)
  b12_mcg: number | null;
  b6_mg: number | null;
  folate_mcg: number | null;
  magnesium_mg: number | null;
  potassium_mg: number | null;
  omega6_mg: number | null;
  iodine_mcg: number | null;
  selenium_mcg: number | null;
  phosphorus_mg: number | null;
  choline_mg: number | null;
  dha_mg: number | null;
  vitamin_k_mcg: number | null;
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
