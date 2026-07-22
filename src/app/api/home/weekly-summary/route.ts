import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createClient as createAnthropicClient } from '@/lib/anthropic/client'
import { buildWeeklySummaryPrompt } from '@/lib/log/prompts'

function subtractDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10)
}

function toUtcBound(localDate: string, offsetMinutes: number, endOfDay: boolean): string {
  const [y, m, d] = localDate.split('-').map(Number)
  const h = endOfDay ? 23 : 0
  const min = endOfDay ? 59 : 0
  const sec = endOfDay ? 59 : 0
  return new Date(Date.UTC(y, m - 1, d, h, min, sec) - offsetMinutes * 60_000).toISOString()
}

function toLocalDate(utcIso: string, offsetMinutes: number): string {
  return new Date(new Date(utcIso).getTime() + offsetMinutes * 60_000).toISOString().slice(0, 10)
}

function getTargets(ageMonths: number) {
  if (ageMonths < 7)  return { calories_kcal: 700,  protein_g: 10, carbs_g: 75,  fat_g: 30, fibre_g: 5,  sugar_g: 8,  sodium_mg: 320,  iron_mg: 11 }
  if (ageMonths < 13) return { calories_kcal: 800,  protein_g: 11, carbs_g: 90,  fat_g: 35, fibre_g: 5,  sugar_g: 10, sodium_mg: 400,  iron_mg: 11 }
  if (ageMonths < 37) return { calories_kcal: 1200, protein_g: 15, carbs_g: 130, fat_g: 40, fibre_g: 15, sugar_g: 25, sodium_mg: 800,  iron_mg: 7  }
  if (ageMonths < 73) return { calories_kcal: 1500, protein_g: 20, carbs_g: 210, fat_g: 55, fibre_g: 20, sugar_g: 18, sodium_mg: 1200, iron_mg: 6  }
  return               { calories_kcal: 1800, protein_g: 28, carbs_g: 260, fat_g: 70, fibre_g: 25, sugar_g: 24, sodium_mg: 2000, iron_mg: 9  }
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const childId       = searchParams.get('childId')
  const date          = searchParams.get('date')
  const childName     = searchParams.get('childName') ?? 'your little one'
  const offsetMinutes = parseInt(searchParams.get('utcOffset') ?? '0', 10) || 0

  if (!childId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const admin      = createAdminClient()
  const weekStart  = toUtcBound(subtractDays(date, 6), offsetMinutes, false)
  const weekEnd    = toUtcBound(date, offsetMinutes, true)

  const [logsResult, childResult] = await Promise.all([
    admin
      .from('food_logs')
      .select('logged_at, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, sodium_mg, iron_mg, is_hard_food_day, food_name')
      .eq('child_id', childId)
      .gte('logged_at', weekStart)
      .lte('logged_at', weekEnd),
    admin
      .from('children')
      .select('date_of_birth')
      .eq('id', childId)
      .single(),
  ])

  if (logsResult.error) return NextResponse.json({ error: logsResult.error.message }, { status: 500 })

  let ageMonths = 24
  if (childResult.data?.date_of_birth) {
    const dob = new Date(childResult.data.date_of_birth)
    const now = new Date()
    ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  }
  const targets = getTargets(ageMonths)

  const realLogs = (logsResult.data ?? []).filter((l) => !l.is_hard_food_day && l.food_name)

  if (realLogs.length === 0) {
    return NextResponse.json({
      summary: `Nothing logged this week yet — that's completely fine. When you do log, SHAi will give you a proper picture of how ${childName}'s week is going.`,
    })
  }

  // Group by local date, sum nutrients per day
  type DayTotals = { calories_kcal: number; protein_g: number; carbs_g: number; fat_g: number; fibre_g: number; sugar_g: number; sodium_mg: number; iron_mg: number }
  const dayMap = new Map<string, DayTotals>()

  for (const log of realLogs) {
    const localDay = toLocalDate(log.logged_at, offsetMinutes)
    if (!dayMap.has(localDay)) {
      dayMap.set(localDay, { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sodium_mg: 0, iron_mg: 0 })
    }
    const t = dayMap.get(localDay)!
    t.calories_kcal += log.calories_kcal ?? 0
    t.protein_g     += log.protein_g     ?? 0
    t.carbs_g       += log.carbs_g       ?? 0
    t.fat_g         += log.fat_g         ?? 0
    t.fibre_g       += log.fibre_g       ?? 0
    t.sugar_g       += log.sugar_g       ?? 0
    t.sodium_mg     += log.sodium_mg     ?? 0
    t.iron_mg       += log.iron_mg       ?? 0
  }

  const daysLogged = dayMap.size
  const sum: DayTotals = { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sodium_mg: 0, iron_mg: 0 }
  for (const t of dayMap.values()) {
    sum.calories_kcal += t.calories_kcal
    sum.protein_g     += t.protein_g
    sum.carbs_g       += t.carbs_g
    sum.fat_g         += t.fat_g
    sum.fibre_g       += t.fibre_g
    sum.sugar_g       += t.sugar_g
    sum.sodium_mg     += t.sodium_mg
    sum.iron_mg       += t.iron_mg
  }

  const nutrients = [
    { name: 'Calories',      value: Math.round(sum.calories_kcal / daysLogged), target: targets.calories_kcal, unit: ' kcal' },
    { name: 'Protein',       value: Math.round(sum.protein_g / daysLogged),     target: targets.protein_g,     unit: 'g' },
    { name: 'Carbs',         value: Math.round(sum.carbs_g / daysLogged),       target: targets.carbs_g,       unit: 'g' },
    { name: 'Fat',           value: Math.round(sum.fat_g / daysLogged),         target: targets.fat_g,         unit: 'g' },
    { name: 'Fibre',         value: parseFloat((sum.fibre_g / daysLogged).toFixed(1)), target: targets.fibre_g, unit: 'g' },
    { name: 'Sugar',         value: Math.round(sum.sugar_g / daysLogged),       target: targets.sugar_g,       unit: 'g' },
    { name: 'Salt (sodium)', value: Math.round(sum.sodium_mg / daysLogged),     target: targets.sodium_mg,     unit: 'mg' },
    { name: 'Iron',          value: parseFloat((sum.iron_mg / daysLogged).toFixed(1)), target: targets.iron_mg, unit: 'mg' },
  ]

  const anthropic = createAnthropicClient()
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{ role: 'user', content: buildWeeklySummaryPrompt(childName, ageMonths, daysLogged, nutrients) }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  const summary = raw.replace(/^#+\s*[^\n]*\n+/g, '').trim()
  return NextResponse.json({ summary })
}
