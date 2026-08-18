import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getUpcomingEvent } from '@/lib/developmental/leaps'
import { parseDob } from '@/lib/format/dates'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const childId = searchParams.get('childId')
  if (!childId) return NextResponse.json({ event: null })

  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('date_of_birth, gestational_age_at_birth, leaps_surfaced')
    .eq('id', childId)
    .single()

  if (!child?.date_of_birth) return NextResponse.json({ event: null })

  // Adjusted age for premature babies: subtract weeks born early × 7
  const gestWeeks = child.gestational_age_at_birth ?? 40
  const premAdjustDays = Math.max(0, (40 - gestWeeks) * 7)
  const birth = parseDob(child.date_of_birth)
  if (!birth) return NextResponse.json({ event: null })
  const ageInDays = Math.floor((Date.now() - birth.getTime()) / 86_400_000) - premAdjustDays

  const surfaced: number[] = child.leaps_surfaced ?? []
  const result = getUpcomingEvent(ageInDays, surfaced)
  if (!result) return NextResponse.json({ event: null })

  // Mark as surfaced immediately so it never shows again across sessions
  await admin
    .from('children')
    .update({ leaps_surfaced: [...surfaced, result.event.id] })
    .eq('id', childId)

  return NextResponse.json({
    event: {
      id: result.event.id,
      name: result.event.name,
      type: result.event.type,
      shaiMessage: result.event.shaiMessage,
      daysUntil: result.daysUntil,
    },
  })
}
