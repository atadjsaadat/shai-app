import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ParsedFoodItem, MealType } from '@/lib/log/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { childId, items, mealType, isHardFoodDay }: {
    childId: string
    items: ParsedFoodItem[]
    mealType: MealType
    isHardFoodDay: boolean
  } = await request.json()

  if (!childId) return NextResponse.json({ error: 'No child profile found — please complete setup first.' }, { status: 400 })

  const admin = createAdminClient()

  if (isHardFoodDay) {
    const { error } = await admin.from('food_logs').insert({
      child_id: childId,
      logged_by_user_id: user.id,
      meal_type: mealType,
      is_hard_food_day: true,
      data_source: 'ai',
    })
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ success: true })
  }

  if (mealType === 'hydration') {
    const hydrationRows = items.map((item) => ({
      child_id: childId,
      drink_type: item.food_name,
      amount_ml: null,
      confidence_score: item.confidence_score,
    }))
    const { error } = await admin.from('hydration_logs').insert(hydrationRows)
    return error
      ? NextResponse.json({ error: error.message }, { status: 500 })
      : NextResponse.json({ success: true })
  }

  const rows = items.map((item) => ({
    child_id: childId,
    logged_by_user_id: user.id,
    meal_type: mealType,
    food_name: item.food_name,
    serving_size_description: item.serving_size_description,
    data_source: 'ai',
    confidence_score: item.confidence_score,
    // Core macros
    calories_kcal:    item.calories_kcal,
    protein_g:        item.protein_g,
    carbs_g:          item.carbs_g,
    fat_g:            item.fat_g,
    fibre_g:          item.fibre_g,
    sugar_g:          item.sugar_g,
    saturated_fat_g:  item.saturated_fat_g,
    sodium_mg:        item.sodium_mg,
    // Displayed micronutrients
    iron_mg:          item.iron_mg,
    calcium_mg:       item.calcium_mg,
    vitamin_c_mg:     item.vitamin_c_mg,
    vitamin_a_mcg:    item.vitamin_a_mcg,
    vitamin_d_mcg:    item.vitamin_d_mcg,
    zinc_mg:          item.zinc_mg,
    omega3_mg:        item.omega3_mg,
    // Shadow-logged micronutrients
    b12_mcg:          item.b12_mcg,
    b6_mg:            item.b6_mg,
    folate_mcg:       item.folate_mcg,
    magnesium_mg:     item.magnesium_mg,
    potassium_mg:     item.potassium_mg,
    omega6_mg:        item.omega6_mg,
    iodine_mcg:       item.iodine_mcg,
    selenium_mcg:     item.selenium_mcg,
    phosphorus_mg:    item.phosphorus_mg,
    choline_mg:       item.choline_mg,
    dha_mg:           item.dha_mg,
    vitamin_k_mcg:    item.vitamin_k_mcg,
  }))

  const { error } = await admin.from('food_logs').insert(rows)
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true })
}
