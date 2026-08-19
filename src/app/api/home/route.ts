import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getTargets } from '@/lib/nutrition/targets'
import { parseDob } from '@/lib/format/dates'
import { getUpcomingEvent } from '@/lib/developmental/leaps'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const childIdParam = searchParams.get('childId')
  const date = searchParams.get('date')
  const offsetMinutes = parseInt(searchParams.get('utcOffset') ?? '0', 10) || 0
  const weekSince = searchParams.get('weekSince')

  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const admin = createAdminClient()

  type ChildRow = {
    id: string
    name: string
    date_of_birth: string | null
    gestational_age_at_birth: number | null
    leaps_surfaced: number[] | null
  }

  let childId: string
  let childRow: ChildRow | null = null

  if (!childIdParam) {
    const { data } = await admin
      .from('children')
      .select('id, name, date_of_birth, gestational_age_at_birth, leaps_surfaced')
      .or(`user_id.eq.${user.id},linked_user_ids.cs.{${user.id}}`)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (!data) return NextResponse.json({ childId: null, childName: null })
    childId = data.id
    childRow = data
  } else {
    childId = childIdParam
  }

  const [ty, tm, td] = date.split('-').map(Number)
  const utcStart = new Date(Date.UTC(ty, tm - 1, td, 0, 0, 0) - offsetMinutes * 60_000).toISOString()
  const utcEnd   = new Date(Date.UTC(ty, tm - 1, td, 23, 59, 59) - offsetMinutes * 60_000).toISOString()

  const winsQuery = (() => {
    let q = admin
      .from('wins')
      .select('id, logged_at, win_type, food_involved, parent_note, child_age_days, photo_url')
      .eq('child_id', childId)
      .order('logged_at', { ascending: false })
    if (weekSince) q = q.gte('logged_at', weekSince)
    return q
  })()

  const [logsResult, childDetailsResult, appointmentsResult, winsResult, lastFeedResult] = await Promise.all([
    admin
      .from('food_logs')
      .select('meal_type, food_name, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, sodium_mg, iron_mg, is_hard_food_day')
      .eq('child_id', childId)
      .gte('logged_at', utcStart)
      .lte('logged_at', utcEnd)
      .order('logged_at', { ascending: true }),
    childRow
      ? Promise.resolve({ data: childRow as ChildRow })
      : admin
          .from('children')
          .select('id, name, date_of_birth, gestational_age_at_birth, leaps_surfaced')
          .eq('id', childId)
          .single(),
    admin
      .from('appointments')
      .select('*')
      .eq('child_id', childId)
      .order('scheduled_at', { ascending: true }),
    winsQuery,
    admin
      .from('newborn_feed_logs')
      .select('logged_at, feed_type, breast_side, duration_minutes, amount_ml')
      .eq('child_id', childId)
      .order('logged_at', { ascending: false })
      .limit(1),
  ])

  if (!childRow) childRow = (childDetailsResult as { data: ChildRow | null }).data

  // Nutrition totals
  const realLogs = (logsResult.data ?? []).filter((l) => !l.is_hard_food_day && l.food_name)

  let ageMonths = 24
  const dob = parseDob(childRow?.date_of_birth)
  if (dob) {
    const now = new Date()
    ageMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth())
  }
  const targets = getTargets(ageMonths)

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
  const meals = ORDER.filter((t) => mealMap.has(t)).map((t) => ({ meal_type: t, items: mealMap.get(t)! }))
  for (const [type, items] of mealMap) {
    if (!ORDER.includes(type)) meals.push({ meal_type: type, items })
  }

  // Developmental leap check
  let leap: { id: number; name: string; type: string; shaiMessage: string; daysUntil: number } | null = null
  if (childRow?.date_of_birth) {
    const gestWeeks = childRow.gestational_age_at_birth ?? 40
    const premAdjustDays = Math.max(0, (40 - gestWeeks) * 7)
    const birth = parseDob(childRow.date_of_birth)
    if (birth) {
      const ageInDays = Math.floor((Date.now() - birth.getTime()) / 86_400_000) - premAdjustDays
      const surfaced: number[] = childRow.leaps_surfaced ?? []
      const result = getUpcomingEvent(ageInDays, surfaced)
      if (result) {
        leap = {
          id: result.event.id,
          name: result.event.name,
          type: result.event.type,
          shaiMessage: result.event.shaiMessage,
          daysUntil: result.daysUntil,
        }
        await admin
          .from('children')
          .update({ leaps_surfaced: [...surfaced, result.event.id] })
          .eq('id', childId)
      }
    }
  }

  return NextResponse.json({
    childId,
    childName: childRow?.name ?? null,
    totals,
    targets,
    meals,
    ageMonths,
    appointments: appointmentsResult.data ?? [],
    wins: winsResult.data ?? [],
    leap,
    lastFeed: lastFeedResult.data?.[0] ?? null,
  })
}
