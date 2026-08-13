import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

function timeOfDay(date: Date): string {
  const h = date.getHours()
  if (h >= 5 && h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const childId = req.nextUrl.searchParams.get('childId')
  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: child } = await admin
    .from('children')
    .select('date_of_birth')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const ageDays = child.date_of_birth
    ? Math.floor((Date.now() - new Date(child.date_of_birth).getTime()) / 86_400_000)
    : null

  const { data: feeds, error } = await admin
    .from('newborn_feed_logs')
    .select('id, logged_at, feed_type, breast_side, duration_minutes, amount_ml, reaction_type, reaction_note, child_age_days')
    .eq('child_id', childId)
    .order('logged_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const [
    { data: firstFeedRows, count: totalCount },
    { count: nightFeedCount },
    { data: allFeedStats },
  ] = await Promise.all([
    admin
      .from('newborn_feed_logs')
      .select('logged_at', { count: 'exact' })
      .eq('child_id', childId)
      .order('logged_at', { ascending: true })
      .limit(1),
    admin
      .from('newborn_feed_logs')
      .select('id', { count: 'exact', head: true })
      .eq('child_id', childId)
      .eq('is_night_feed', true),
    admin
      .from('newborn_feed_logs')
      .select('feed_type, duration_minutes, amount_ml')
      .eq('child_id', childId),
  ])

  const totalBreastMinutes = allFeedStats
    ?.filter(f => f.feed_type === 'breast' && f.duration_minutes != null)
    ?.reduce((s, f) => s + (f.duration_minutes as number), 0) ?? 0

  const totalAmountMl = allFeedStats
    ?.filter(f => f.feed_type !== 'breast' && f.amount_ml != null)
    ?.reduce((s, f) => s + (f.amount_ml as number), 0) ?? 0

  return NextResponse.json({
    feeds: feeds ?? [],
    ageDays,
    totalCount: totalCount ?? 0,
    firstFeedAt: firstFeedRows?.[0]?.logged_at ?? null,
    nightFeedCount: nightFeedCount ?? 0,
    totalBreastMinutes,
    totalAmountMl,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { childId, feedType, breastSide, durationMinutes, amountMl, reactionType, reactionNote, loggedAt } = await req.json()

  if (!childId || !feedType || !loggedAt) {
    return NextResponse.json({ error: 'childId, feedType, and loggedAt are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: child } = await admin
    .from('children')
    .select('date_of_birth')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const logDate = new Date(loggedAt)
  const childAgeDays = child.date_of_birth
    ? Math.floor((logDate.getTime() - new Date(child.date_of_birth).getTime()) / 86_400_000)
    : null

  const h = logDate.getHours()

  const { data, error } = await admin
    .from('newborn_feed_logs')
    .insert({
      child_id: childId,
      logged_by_user_id: user.id,
      logged_at: loggedAt,
      feed_type: feedType,
      breast_side: feedType === 'breast' ? (breastSide ?? null) : null,
      duration_minutes: feedType === 'breast' && durationMinutes ? parseInt(durationMinutes) : null,
      amount_ml: feedType !== 'breast' && amountMl ? parseFloat(amountMl) : null,
      reaction_type: reactionType?.length ? reactionType : null,
      reaction_note: reactionNote ?? null,
      child_age_days: childAgeDays,
      time_of_day: timeOfDay(logDate),
      is_night_feed: h < 5 || h >= 21,
    })
    .select('id, logged_at, feed_type, breast_side, duration_minutes, amount_ml, reaction_type, reaction_note, child_age_days')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feed: data })
}
