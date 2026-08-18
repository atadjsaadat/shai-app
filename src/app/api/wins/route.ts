import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { parseDob } from '@/lib/format/dates'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const since = new URL(request.url).searchParams.get('since')

  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!child) return NextResponse.json({ wins: [] })

  let query = admin
    .from('wins')
    .select('id, logged_at, win_type, food_involved, parent_note, child_age_days, photo_url')
    .eq('child_id', child.id)
    .order('logged_at', { ascending: false })

  if (since) query = query.gte('logged_at', since)

  const { data: wins, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ wins: wins ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { win_type, food_involved, parent_note, photo_url } = await req.json()
  if (!win_type) return NextResponse.json({ error: 'win_type required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('id, date_of_birth')
    .eq('user_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: 'No child found' }, { status: 404 })

  const birth = parseDob(child.date_of_birth)
  const child_age_days = birth ? Math.floor((Date.now() - birth.getTime()) / 86_400_000) : null

  const now = new Date()
  const month = now.getMonth()
  const season =
    month >= 2 && month <= 4 ? 'spring' :
    month >= 5 && month <= 7 ? 'summer' :
    month >= 8 && month <= 10 ? 'autumn' : 'winter'

  const { data, error } = await admin
    .from('wins')
    .insert({
      child_id: child.id,
      logged_by_user_id: user.id,
      win_type,
      food_involved: food_involved || null,
      parent_note: parent_note || null,
      photo_url: photo_url || null,
      child_age_days,
      season,
    })
    .select('id, logged_at, win_type, food_involved, parent_note, child_age_days, photo_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ win: data })
}
