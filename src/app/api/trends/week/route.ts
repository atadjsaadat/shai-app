import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTargets } from '@/lib/nutrition/targets'
import type { Targets } from '@/lib/nutrition/targets'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toLocalDateStr(utcMs: number, offsetMinutes: number): string {
  const d = new Date(utcMs + offsetMinutes * 60_000)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
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
  const admin = createAdminClient()

  const [childResult, profileResult] = await Promise.all([
    admin.from('children').select('date_of_birth').eq('id', childId).single(),
    admin.from('profiles').select('tier').eq('id', user.id).single(),
  ])

  let ageMonths = 24
  if (childResult.data?.date_of_birth) {
    const dob = new Date(childResult.data.date_of_birth)
    const now = new Date()
    ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  }
  const targets = getTargets(ageMonths)
  const tier = (profileResult.data?.tier ?? 'free') as string
  const historyDays = tier === 'free' ? 3 : 7

  // Today as UTC midnight, then build 7-day local date list (oldest → newest)
  const todayMs = Date.UTC(ty, tm - 1, td)
  const localDates = Array.from({ length: 7 }, (_, i) => {
    const ms = todayMs - (6 - i) * 86_400_000
    const d = new Date(ms)
    return {
      date: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`,
      dayLabel: DAY_LABELS[d.getUTCDay()],
    }
  })

  // UTC range covering the full 7 local days
  const utcRangeStart = new Date((todayMs - 6 * 86_400_000) - offsetMinutes * 60_000).toISOString()
  const utcRangeEnd   = new Date((todayMs + 86_400_000 - 1) - offsetMinutes * 60_000).toISOString()

  const [{ data: logs, error }, { data: feedLogs }] = await Promise.all([
    admin
      .from('food_logs')
      .select('logged_at, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, sodium_mg, iron_mg, is_hard_food_day, food_name, product_category')
      .eq('child_id', childId)
      .gte('logged_at', utcRangeStart)
      .lte('logged_at', utcRangeEnd),
    admin
      .from('newborn_feed_logs')
      .select('logged_at, feed_type, duration_minutes, amount_ml')
      .eq('child_id', childId)
      .gte('logged_at', utcRangeStart)
      .lte('logged_at', utcRangeEnd),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const feedDayMap = new Map<string, { count: number; totalMl: number; totalMinutes: number }>()
  for (const f of (feedLogs ?? [])) {
    const d = toLocalDateStr(new Date(f.logged_at).getTime(), offsetMinutes)
    if (!feedDayMap.has(d)) feedDayMap.set(d, { count: 0, totalMl: 0, totalMinutes: 0 })
    const agg = feedDayMap.get(d)!
    agg.count++
    if (f.amount_ml) agg.totalMl += f.amount_ml
    if (f.duration_minutes) agg.totalMinutes += f.duration_minutes
  }
  const feedDays = localDates.map(({ date, dayLabel }) => {
    const agg = feedDayMap.get(date)
    return { date, dayLabel, count: agg?.count ?? 0, totalMl: agg?.totalMl ?? 0, totalMinutes: agg?.totalMinutes ?? 0 }
  })

  // Group by local date and sum nutrients
  const dayTotalsMap = new Map<string, Targets>()
  let mealCount = 0
  for (const log of (logs ?? [])) {
    if (!log.food_name || log.is_hard_food_day) continue
    mealCount++
    const localDate = toLocalDateStr(new Date(log.logged_at).getTime(), offsetMinutes)
    if (!dayTotalsMap.has(localDate)) {
      dayTotalsMap.set(localDate, { calories_kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sugar_g: 0, sodium_mg: 0, iron_mg: 0 })
    }
    const t = dayTotalsMap.get(localDate)!
    t.calories_kcal += log.calories_kcal ?? 0
    t.protein_g     += log.protein_g     ?? 0
    t.carbs_g       += log.carbs_g       ?? 0
    t.fat_g         += log.fat_g         ?? 0
    t.fibre_g       += log.fibre_g       ?? 0
    t.sugar_g       += log.sugar_g       ?? 0
    t.sodium_mg     += log.sodium_mg     ?? 0
    t.iron_mg       += log.iron_mg       ?? 0
  }

  // Free = last 3 days visible; premium = all 7. Index 0 = oldest day.
  const lockThreshold = 7 - historyDays
  const days = localDates.map(({ date, dayLabel }, idx) => ({
    date,
    dayLabel,
    hasLogs: dayTotalsMap.has(date),
    totals: idx < lockThreshold ? null : (dayTotalsMap.get(date) ?? null),
    locked: idx < lockThreshold,
  }))

  const loggedCount = days.filter(d => d.hasLogs).length

  // Average across visible days that have logs
  const visibleWithLogs = days.filter(d => !d.locked && d.totals)
  let averages: Targets | null = null
  if (visibleWithLogs.length > 0) {
    const n = visibleWithLogs.length
    averages = {
      calories_kcal: visibleWithLogs.reduce((s, d) => s + d.totals!.calories_kcal, 0) / n,
      protein_g:     visibleWithLogs.reduce((s, d) => s + d.totals!.protein_g,     0) / n,
      carbs_g:       visibleWithLogs.reduce((s, d) => s + d.totals!.carbs_g,       0) / n,
      fat_g:         visibleWithLogs.reduce((s, d) => s + d.totals!.fat_g,         0) / n,
      fibre_g:       visibleWithLogs.reduce((s, d) => s + d.totals!.fibre_g,       0) / n,
      sugar_g:       visibleWithLogs.reduce((s, d) => s + d.totals!.sugar_g,       0) / n,
      sodium_mg:     visibleWithLogs.reduce((s, d) => s + d.totals!.sodium_mg,     0) / n,
      iron_mg:       visibleWithLogs.reduce((s, d) => s + d.totals!.iron_mg,       0) / n,
    }
  }

  // Top foods by frequency
  const foodCounts = new Map<string, { name: string; count: number; category: string | null }>()
  for (const log of (logs ?? [])) {
    if (!log.food_name || log.is_hard_food_day) continue
    const key = log.food_name.toLowerCase().trim()
    const existing = foodCounts.get(key)
    if (existing) existing.count++
    else foodCounts.set(key, { name: log.food_name, count: 1, category: log.product_category ?? null })
  }
  const topFoods = [...foodCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5)

  return NextResponse.json({ days, targets, ageMonths, loggedCount, mealCount, averages, tier, topFoods, feedDays })
}
