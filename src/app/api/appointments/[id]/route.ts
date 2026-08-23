import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { updateAppointment, deleteAppointment } from '@/lib/appointments/queries'
import { upsertVaccination } from '@/lib/health-record/queries'
import type { UpdateAppointmentInput } from '@/lib/appointments/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as UpdateAppointmentInput

  try {
    if (body.attended === true) {
      const admin = createAdminClient()
      const { data: current } = await admin
        .from('appointments')
        .select('child_id, vaccine_keys, scheduled_at')
        .eq('id', id)
        .single()
      if (current?.vaccine_keys?.length) {
        const givenDate = current.scheduled_at.slice(0, 10)
        await Promise.all(
          current.vaccine_keys.map((vk: string) =>
            upsertVaccination(current.child_id, user.id, vk, givenDate, null)
          )
        )
      }
    }

    const appointment = await updateAppointment(id, user.id, body)
    return NextResponse.json({ appointment })
  } catch {
    return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await params

  try {
    await deleteAppointment(id, user.id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 })
  }
}
