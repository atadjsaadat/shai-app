import { createClient } from '@/lib/supabase/client';
import type { ParsedFoodItem, MealType } from './types';

export async function saveFoodLog(
  childId: string,
  items: ParsedFoodItem[],
  mealType: MealType,
  isHardFoodDay: boolean
): Promise<{ error: string | null }> {
  if (!childId) return { error: 'No child profile found — please complete setup first.' };

  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Not signed in.' };

  if (isHardFoodDay) {
    const { error } = await supabase.from('food_logs').insert({
      child_id: childId,
      logged_by_user_id: userData.user.id,
      meal_type: mealType,
      is_hard_food_day: true,
      data_source: 'ai',
    });
    return { error: error?.message ?? null };
  }

  const rows = items.map((item) => ({
    child_id: childId,
    logged_by_user_id: userData.user!.id,
    meal_type: mealType,
    food_name: item.food_name,
    serving_size_description: item.serving_size_description,
    calories_kcal: item.calories_kcal,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    fibre_g: item.fibre_g,
    confidence_score: item.confidence_score,
    data_source: 'ai',
  }));

  const { error } = await supabase.from('food_logs').insert(rows);
  return { error: error?.message ?? null };
}
