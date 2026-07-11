export interface Profile {
  id: string;
  tier: 'free' | 'premium' | 'clinical';
  consent_gdpr: boolean;
  consent_data_research: boolean;
  consent_marketing: boolean;
  data_retention_preference: string | null;
  account_deleted_at: string | null;
  country: string | null;
  language: string;
  subscription_type: string | null;
  subscription_start: string | null;
  subscription_end: string | null;
  last_active: string | null;
  created_at: string;
  updated_at: string;
}

export interface Child {
  id: string;
  user_id: string;
  linked_user_ids: string[];
  name: string;
  date_of_birth: string | null;
  sex: 'male' | 'female' | 'not_specified' | null;
  weight_kg: number | null;
  height_cm: number | null;
  birth_weight_kg: string | null;
  allergies: string[];
  dietary_restrictions: string[];
  is_selective_eater: boolean;
  selective_eater_details: string | null;
  relationship_to_child: string | null;
  dietary_preference: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  child_id: string;
  logged_by_user_id: string;
  logged_at: string;
  meal_type: string | null;
  food_name: string | null;
  brand: string | null;
  data_source: 'ai' | 'barcode' | 'manual' | null;
  serving_size_description: string | null;
  serving_size_g: number | null;
  confidence_score: number | null;
  // free tier macros
  calories_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  // premium micronutrients
  calcium_mg: number | null;
  iron_mg: number | null;
  vitamin_c_mg: number | null;
  vitamin_a_mcg: number | null;
  vitamin_d_mcg: number | null;
  zinc_mg: number | null;
  omega3_mg: number | null;
  // context
  is_hard_food_day: boolean;
  is_win: boolean;
  win_description: string | null;
  reaction_type: string[] | null;
  reaction_note: string | null;
  logged_offline: boolean;
  created_at: string;
  updated_at: string;
}
