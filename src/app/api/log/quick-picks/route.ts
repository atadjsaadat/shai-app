import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { MealType } from '@/lib/log/types'

export interface QuickPick {
  food_name: string
  serving_size_description: string | null
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

function avg(values: (number | null)[]): number | null {
  const nums = values.filter((v): v is number => v != null)
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null
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

  if (!child) return NextResponse.json({ picks: [] })

  const { data: logs } = await admin
    .from('food_logs')
    .select('food_name, serving_size_description, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, saturated_fat_g, sodium_mg, iron_mg, calcium_mg, vitamin_c_mg, vitamin_a_mcg, vitamin_d_mcg, zinc_mg, omega3_mg, b12_mcg, b6_mg, folate_mcg, magnesium_mg, potassium_mg, omega6_mg, iodine_mcg, selenium_mcg, phosphorus_mg, choline_mg, dha_mg, vitamin_k_mcg')
    .eq('child_id', child.id)
    .eq('meal_type', mealType)
    .eq('is_hard_food_day', false)
    .not('food_name', 'is', null)
    .order('logged_at', { ascending: false })
    .limit(200)

  if (!logs || logs.length === 0) return NextResponse.json({ picks: [] })

  type LogRow = typeof logs[number]

  // Group by normalised food name, aggregate nutrients
  const groups = new Map<string, LogRow[]>()
  for (const log of logs) {
    const key = (log.food_name as string).toLowerCase().trim()
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(log)
  }

  const picks: QuickPick[] = Array.from(groups.entries())
    .map(([, entries]) => ({
      food_name: entries[0].food_name as string,
      serving_size_description: entries[0].serving_size_description as string | null,
      use_count: entries.length,
      calories_kcal:    avg(entries.map((e) => e.calories_kcal)),
      protein_g:        avg(entries.map((e) => e.protein_g)),
      carbs_g:          avg(entries.map((e) => e.carbs_g)),
      fat_g:            avg(entries.map((e) => e.fat_g)),
      fibre_g:          avg(entries.map((e) => e.fibre_g)),
      sugar_g:          avg(entries.map((e) => e.sugar_g)),
      saturated_fat_g:  avg(entries.map((e) => e.saturated_fat_g)),
      sodium_mg:        avg(entries.map((e) => e.sodium_mg)),
      iron_mg:          avg(entries.map((e) => e.iron_mg)),
      calcium_mg:       avg(entries.map((e) => e.calcium_mg)),
      vitamin_c_mg:     avg(entries.map((e) => e.vitamin_c_mg)),
      vitamin_a_mcg:    avg(entries.map((e) => e.vitamin_a_mcg)),
      vitamin_d_mcg:    avg(entries.map((e) => e.vitamin_d_mcg)),
      zinc_mg:          avg(entries.map((e) => e.zinc_mg)),
      omega3_mg:        avg(entries.map((e) => e.omega3_mg)),
      b12_mcg:          avg(entries.map((e) => e.b12_mcg)),
      b6_mg:            avg(entries.map((e) => e.b6_mg)),
      folate_mcg:       avg(entries.map((e) => e.folate_mcg)),
      magnesium_mg:     avg(entries.map((e) => e.magnesium_mg)),
      potassium_mg:     avg(entries.map((e) => e.potassium_mg)),
      omega6_mg:        avg(entries.map((e) => e.omega6_mg)),
      iodine_mcg:       avg(entries.map((e) => e.iodine_mcg)),
      selenium_mcg:     avg(entries.map((e) => e.selenium_mcg)),
      phosphorus_mg:    avg(entries.map((e) => e.phosphorus_mg)),
      choline_mg:       avg(entries.map((e) => e.choline_mg)),
      dha_mg:           avg(entries.map((e) => e.dha_mg)),
      vitamin_k_mcg:    avg(entries.map((e) => e.vitamin_k_mcg)),
    }))
    .sort((a, b) => b.use_count - a.use_count)
    .slice(0, 4)

  return NextResponse.json({ picks })
}
