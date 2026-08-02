import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAppointments, createAppointment } from '@/lib/appointments/queries'
import type { CreateAppointmentInput } from '@/lib/appointments/types'

async function getChildId(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase.from('children').select('id').limit(1).single()
  return data?.id ?? null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const childId = await getChildId(supabase)
  if (!childId) return NextResponse.json({ appointments: [] })

  try {
    const appointments = await getAppointments(childId)
    return NextResponse.json({ appointments })
  } catch {
    return NextResponse.json({ error: 'Failed to load appointments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const childId = await getChildId(supabase)
  if (!childId) return NextResponse.json({ error: 'No child profile' }, { status: 400 })

  const body = await req.json() as CreateAppointmentInput
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!body.scheduled_at) return NextResponse.json({ error: 'Date required' }, { status: 400 })

  try {
    const appointment = await createAppointment(childId, user.id, {
      title: body.title.trim(),
      appointment_type: body.appointment_type ?? null,
      scheduled_at: body.scheduled_at,
      location: body.location?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    })
    return NextResponse.json({ appointment })
  } catch {
    return NextResponse.json({ error: 'Failed to save appointment' }, { status: 500 })
  }
}
