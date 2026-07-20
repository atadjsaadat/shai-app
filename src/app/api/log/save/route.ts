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

  const rows = items.map((item) => ({
    child_id: childId,
    logged_by_user_id: user.id,
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
  }))

  const { error } = await admin.from('food_logs').insert(rows)
  return error
    ? NextResponse.json({ error: error.message }, { status: 500 })
    : NextResponse.json({ success: true })
}
