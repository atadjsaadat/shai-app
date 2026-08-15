import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const userId = user.id

  // Get all child IDs belonging to this user
  const { data: children } = await admin
    .from('children')
    .select('id')
    .eq('user_id', userId)

  const childIds = children?.map(c => c.id) ?? []

  // Delete all child-linked data
  if (childIds.length > 0) {
    await Promise.all([
      admin.from('food_logs').delete().in('child_id', childIds),
      admin.from('wins').delete().in('child_id', childIds),
      admin.from('growth_records').delete().in('child_id', childIds),
      admin.from('sleep_logs').delete().in('child_id', childIds),
      admin.from('appointments').delete().in('child_id', childIds),
      admin.from('newborn_feed_logs').delete().in('child_id', childIds),
      admin.from('hydration_logs').delete().in('child_id', childIds),
      admin.from('supplement_logs').delete().in('child_id', childIds),
    ])
    await admin.from('children').delete().in('id', childIds)
  }

  // Delete user-level data
  await Promise.all([
    admin.from('distress_flags').delete().eq('user_id', userId),
    admin.from('ai_output_logs').delete().eq('user_id', userId),
    admin.from('profiles').delete().eq('id', userId),
  ])

  // Delete auth user — this is irreversible
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
