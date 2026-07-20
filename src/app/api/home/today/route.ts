import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const childId = searchParams.get('childId')
  const date = searchParams.get('date')

  if (!childId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const admin = createAdminClient()
  const { data: logs, error } = await admin
    .from('food_logs')
    .select('meal_type, food_name, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, is_hard_food_day')
    .eq('child_id', childId)
    .gte('logged_at', `${date}T00:00:00`)
    .lte('logged_at', `${date}T23:59:59`)
    .order('logged_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const realLogs = (logs ?? []).filter((l) => !l.is_hard_food_day && l.food_name)

  const totals = realLogs.reduce(
    (acc, l) => ({
      calories_kcal: acc.calories_kcal + (l.calories_kcal ?? 0),
      protein_g: acc.protein_g + (l.protein_g ?? 0),
      carbs_g: acc.carbs_g + (l.carbs_g ?? 0),
      fat_g: acc.fat_g + (l.fat_g ?? 0),
      fibre_g: acc.fibre_g + (l.fibre_g ?? 0),
    }),
    { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0 }
  )

  const ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
  const mealMap = new Map<string, { food_name: string; calories_kcal: number | null }[]>()

  for (const log of realLogs) {
    const type = log.meal_type ?? 'snack'
    if (!mealMap.has(type)) mealMap.set(type, [])
    mealMap.get(type)!.push({ food_name: log.food_name, calories_kcal: log.calories_kcal })
  }

  const meals = ORDER
    .filter((t) => mealMap.has(t))
    .map((t) => ({ meal_type: t, items: mealMap.get(t)! }))

  // catch any meal types not in ORDER (shouldn't happen but defensive)
  for (const [type, items] of mealMap) {
    if (!ORDER.includes(type)) meals.push({ meal_type: type, items })
  }

  return NextResponse.json({ totals, meals })
}
