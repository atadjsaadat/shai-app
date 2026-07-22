import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

interface Targets {
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fibre_g: number
  sugar_g: number
  sodium_mg: number
  iron_mg: number
}

// WHO / NHS UK reference values by age band
function getTargets(ageMonths: number): Targets {
  if (ageMonths < 7) return {
    calories_kcal: 700,  protein_g: 10, carbs_g: 75,  fat_g: 30, fibre_g: 5,
    sugar_g: 8,  sodium_mg: 320,  iron_mg: 11,
  }
  if (ageMonths < 13) return { // 7–12 months
    calories_kcal: 800,  protein_g: 11, carbs_g: 90,  fat_g: 35, fibre_g: 5,
    sugar_g: 10, sodium_mg: 400,  iron_mg: 11,
  }
  if (ageMonths < 37) return { // 1–3 years
    calories_kcal: 1200, protein_g: 15, carbs_g: 130, fat_g: 40, fibre_g: 15,
    sugar_g: 25, sodium_mg: 800,  iron_mg: 7,
  }
  if (ageMonths < 73) return { // 3–6 years
    calories_kcal: 1500, protein_g: 20, carbs_g: 210, fat_g: 55, fibre_g: 20,
    sugar_g: 18, sodium_mg: 1200, iron_mg: 6,
  }
  return { // 6+ years
    calories_kcal: 1800, protein_g: 28, carbs_g: 260, fat_g: 70, fibre_g: 25,
    sugar_g: 24, sodium_mg: 2000, iron_mg: 9,
  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const childId = searchParams.get('childId')
  const date = searchParams.get('date')
  const offsetMinutes = parseInt(searchParams.get('utcOffset') ?? '0', 10) || 0

  if (!childId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const [ty, tm, td] = date.split('-').map(Number)
  const utcStart = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0) - offsetMinutes * 60_000).toISOString()
  const utcEnd   = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59) - offsetMinutes * 60_000).toISOString()

  const admin = createAdminClient()

  const [logsResult, childResult] = await Promise.all([
    admin
      .from('food_logs')
      .select('meal_type, food_name, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, sodium_mg, iron_mg, is_hard_food_day')
      .eq('child_id', childId)
      .gte('logged_at', utcStart)
      .lte('logged_at', utcEnd)
      .order('logged_at', { ascending: true }),
    admin
      .from('child_profiles')
      .select('date_of_birth')
      .eq('id', childId)
      .single(),
  ])

  if (logsResult.error) return NextResponse.json({ error: logsResult.error.message }, { status: 500 })

  // Calculate age in months for age-appropriate targets
  let ageMonths = 24 // default: 1–3 year band
  if (childResult.data?.date_of_birth) {
    const dob = new Date(childResult.data.date_of_birth)
    const now = new Date()
    ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  }
  const targets = getTargets(ageMonths)

  const realLogs = (logsResult.data ?? []).filter((l) => !l.is_hard_food_day && l.food_name)

  const totals = realLogs.reduce(
    (acc, l) => ({
      calories_kcal: acc.calories_kcal + (l.calories_kcal ?? 0),
      protein_g:     acc.protein_g     + (l.protein_g     ?? 0),
      carbs_g:       acc.carbs_g       + (l.carbs_g       ?? 0),
      fat_g:         acc.fat_g         + (l.fat_g         ?? 0),
      fibre_g:       acc.fibre_g       + (l.fibre_g       ?? 0),
      sugar_g:       acc.sugar_g       + (l.sugar_g       ?? 0),
      sodium_mg:     acc.sodium_mg     + (l.sodium_mg     ?? 0),
      iron_mg:       acc.iron_mg       + (l.iron_mg       ?? 0),
    }),
    { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sodium_mg: 0, iron_mg: 0 }
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

  for (const [type, items] of mealMap) {
    if (!ORDER.includes(type)) meals.push({ meal_type: type, items })
  }

  return NextResponse.json({ totals, meals, targets, ageMonths })
}
