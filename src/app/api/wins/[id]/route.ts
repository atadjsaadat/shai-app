import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Verify ownership via child (same pattern as GET)
  const { data: child } = await admin
    .from('children')
    .select('id')
    .or(`user_id.eq.${user.id},linked_user_ids.cs.{${user.id}}`)
    .limit(1)
    .single()

  if (!child) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error } = await admin
    .from('wins')
    .delete()
    .eq('id', id)
    .eq('child_id', child.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const { parent_note, win_type, food_involved, photo_url } = await req.json()

  const updates: Record<string, unknown> = {}
  if (parent_note !== undefined) updates.parent_note = parent_note?.trim() || null
  if (win_type !== undefined) updates.win_type = win_type
  if (food_involved !== undefined) updates.food_involved = food_involved?.trim() || null
  if (photo_url !== undefined) updates.photo_url = photo_url

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('wins')
    .update(updates)
    .eq('id', id)
    .eq('logged_by_user_id', user.id)
    .select('id, logged_at, win_type, food_involved, parent_note, child_age_days, photo_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ win: data })
}
