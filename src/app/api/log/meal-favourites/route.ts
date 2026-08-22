import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { MealType } from '@/lib/log/types'

export interface MealFavourite {
  name: string
  foods: string[]
  use_count: number
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fibre_g: number | null
  sugar_g: number | null
  saturated_fat_g: number | null
  sodium_mg: number | null
  iron_mg: number | null
  calcium_mg: number | null
  vitamin_c_mg: number | null
  vitamin_a_mcg: number | null
  vitamin_d_mcg: number | null
  zinc_mg: number | null
  omega3_mg: number | null
  b12_mcg: number | null
  b6_mg: number | null
  folate_mcg: number | null
  magnesium_mg: number | null
  potassium_mg: number | null
  omega6_mg: number | null
  iodine_mcg: number | null
  selenium_mcg: number | null
  phosphorus_mg: number | null
  choline_mg: number | null
  dha_mg: number | null
  vitamin_k_mcg: number | null
}

type LogRow = {
  food_name: string
  logged_at: string
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fibre_g: number | null
  sugar_g: number | null
  saturated_fat_g: number | null
  sodium_mg: number | null
  iron_mg: number | null
  calcium_mg: number | null
  vitamin_c_mg: number | null
  vitamin_a_mcg: number | null
  vitamin_d_mcg: number | null
  zinc_mg: number | null
  omega3_mg: number | null
  b12_mcg: number | null
  b6_mg: number | null
  folate_mcg: number | null
  magnesium_mg: number | null
  potassium_mg: number | null
  omega6_mg: number | null
  iodine_mcg: number | null
  selenium_mcg: number | null
  phosphorus_mg: number | null
  choline_mg: number | null
  dha_mg: number | null
  vitamin_k_mcg: number | null
}

function sumNutrient(rows: LogRow[], key: keyof LogRow): number | null {
  const nums = rows.map(r => r[key] as number | null).filter((v): v is number => v != null)
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) : null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const mealType = req.nextUrl.searchParams.get('mealType') as MealType | null
  if (!mealType) return NextResponse.json({ error: 'Missing mealType' }, { status: 400 })

  const admin = createAdminClient()

  const { data: child } = await admin
    .from('children')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!child) return NextResponse.json({ meals: [] })

  const fourDaysAgo = new Date()
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 7)

  const { data: logs } = await admin
    .from('food_logs')
    .select('food_name, logged_at, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, saturated_fat_g, sodium_mg, iron_mg, calcium_mg, vitamin_c_mg, vitamin_a_mcg, vitamin_d_mcg, zinc_mg, omega3_mg, b12_mcg, b6_mg, folate_mcg, magnesium_mg, potassium_mg, omega6_mg, iodine_mcg, selenium_mcg, phosphorus_mg, choline_mg, dha_mg, vitamin_k_mcg')
    .eq('child_id', child.id)
    .eq('meal_type', mealType)
    .eq('is_hard_food_day', false)
    .not('food_name', 'is', null)
    .gte('logged_at', fourDaysAgo.toISOString())
    .order('logged_at', { ascending: true })

  if (!logs || logs.length === 0) return NextResponse.json({ meals: [] })

  // Count how many distinct days each food name appears on (case-insensitive)
  // Track the most recent row per food name for display + nutrients
  const foodDays = new Map<string, Set<string>>()   // key -> set of days
  const foodBestRow = new Map<string, LogRow>()     // key -> most recent row
  const foodDisplayName = new Map<string, string>() // key -> display name

  for (const log of logs as LogRow[]) {
    const day = log.logged_at.slice(0, 10)
    const key = log.food_name.toLowerCase().trim()
    if (!foodDays.has(key)) {
      foodDays.set(key, new Set())
      foodBestRow.set(key, log)
      foodDisplayName.set(key, log.food_name)
    }
    foodDays.get(key)!.add(day)
    if (log.logged_at > foodBestRow.get(key)!.logged_at) {
      foodBestRow.set(key, log)
      foodDisplayName.set(key, log.food_name)
    }
  }

  // Only include foods logged on 2+ distinct days; sort by frequency
  const meals: MealFavourite[] = Array.from(foodDays.entries())
    .filter(([, days]) => days.size > 1)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 5)
    .map(([norm, days]) => {
      const row = foodBestRow.get(norm)!
      const displayName = foodDisplayName.get(norm)!
      return {
        name: displayName,
        foods: [displayName],
        use_count: days.size,
        calories_kcal:   row.calories_kcal,
        protein_g:       row.protein_g,
        carbs_g:         row.carbs_g,
        fat_g:           row.fat_g,
        fibre_g:         row.fibre_g,
        sugar_g:         row.sugar_g,
        saturated_fat_g: row.saturated_fat_g,
        sodium_mg:       row.sodium_mg,
        iron_mg:         row.iron_mg,
        calcium_mg:      row.calcium_mg,
        vitamin_c_mg:    row.vitamin_c_mg,
        vitamin_a_mcg:   row.vitamin_a_mcg,
        vitamin_d_mcg:   row.vitamin_d_mcg,
        zinc_mg:         row.zinc_mg,
        omega3_mg:       row.omega3_mg,
        b12_mcg:         row.b12_mcg,
        b6_mg:           row.b6_mg,
        folate_mcg:      row.folate_mcg,
        magnesium_mg:    row.magnesium_mg,
        potassium_mg:    row.potassium_mg,
        omega6_mg:       row.omega6_mg,
        iodine_mcg:      row.iodine_mcg,
        selenium_mcg:    row.selenium_mcg,
        phosphorus_mg:   row.phosphorus_mg,
        choline_mg:      row.choline_mg,
        dha_mg:          row.dha_mg,
        vitamin_k_mcg:   row.vitamin_k_mcg,
      }
    })

  return NextResponse.json({ meals })
}
