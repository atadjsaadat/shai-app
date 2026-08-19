import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getMilestones, createMilestone } from '@/lib/baby-book/queries'
import type { CreateMilestoneInput } from '@/lib/baby-book/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('id')
    .or(`user_id.eq.${user.id},linked_user_ids.cs.{${user.id}}`)
    .limit(1)
    .single()

  if (!child) return NextResponse.json({ entries: [] })

  try {
    const entries = await getMilestones(child.id)
    return NextResponse.json({ entries })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body: CreateMilestoneInput = await request.json()
  if (!body.milestone_type || !body.title || !body.milestone_date) {
    return NextResponse.json({ error: 'milestone_type, title, and milestone_date are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('id, date_of_birth')
    .or(`user_id.eq.${user.id},linked_user_ids.cs.{${user.id}}`)
    .limit(1)
    .single()

  if (!child) return NextResponse.json({ error: 'No child found' }, { status: 404 })

  try {
    const entry = await createMilestone(child.id, user.id, child.date_of_birth ?? null, body)
    return NextResponse.json({ entry })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
