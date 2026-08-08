import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const childId     = searchParams.get('childId')
  const date        = searchParams.get('date')
  const offsetMinutes = parseInt(searchParams.get('utcOffset') ?? '0', 10) || 0

  if (!childId || !date) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const [ty, tm, td] = date.split('-').map(Number)
  const dayMs    = Date.UTC(ty, tm - 1, td)
  const utcStart = new Date(dayMs - offsetMinutes * 60_000).toISOString()
  const utcEnd   = new Date(dayMs + 86_400_000 - 1 - offsetMinutes * 60_000).toISOString()

  const admin = createAdminClient()
  const { data: raw, error } = await admin
    .from('food_logs')
    .select('id, meal_type, food_name, serving_size_description, calories_kcal, is_hard_food_day, logged_at')
    .eq('child_id', childId)
    .gte('logged_at', utcStart)
    .lte('logged_at', utcEnd)
    .order('logged_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const entries = (raw ?? []).filter(e => e.food_name && !e.is_hard_food_day)
  return NextResponse.json({ entries })
}
