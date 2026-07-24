import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const { parent_note } = await req.json()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('wins')
    .update({ parent_note: parent_note?.trim() || null })
    .eq('id', id)
    .eq('logged_by_user_id', user.id)
    .select('id, parent_note')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ win: data })
}
