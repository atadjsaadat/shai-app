import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { logIds, childId }: { logIds: string[]; childId: string } = await request.json()
  if (!logIds?.length || !childId) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('food_logs').delete().in('id', logIds).eq('child_id', childId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
