import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const userId = user.id

  const { data: children } = await admin
    .from('children')
    .select('*')
    .eq('user_id', userId)

  const childIds = children?.map(c => c.id) ?? []

  const [foodLogs, wins, growthRecords, sleepLogs, appointments, feedLogs, hydrationLogs, supplementLogs] =
    await Promise.all(
      childIds.length > 0
        ? [
            admin.from('food_logs').select('*').in('child_id', childIds),
            admin.from('wins').select('*').in('child_id', childIds),
            admin.from('growth_records').select('*').in('child_id', childIds),
            admin.from('sleep_logs').select('*').in('child_id', childIds),
            admin.from('appointments').select('*').in('child_id', childIds),
            admin.from('newborn_feed_logs').select('*').in('child_id', childIds),
            admin.from('hydration_logs').select('*').in('child_id', childIds),
            admin.from('supplement_logs').select('*').in('child_id', childIds),
          ]
        : Array(8).fill(Promise.resolve({ data: [] }))
    )

  const payload = {
    exported_at: new Date().toISOString(),
    account: { email: user.email, created_at: user.created_at },
    children: children ?? [],
    food_logs: foodLogs.data ?? [],
    wins: wins.data ?? [],
    growth_records: growthRecords.data ?? [],
    sleep_logs: sleepLogs.data ?? [],
    appointments: appointments.data ?? [],
    newborn_feed_logs: feedLogs.data ?? [],
    hydration_logs: hydrationLogs.data ?? [],
    supplement_logs: supplementLogs.data ?? [],
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="shai-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
}
