import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getVaccinations, upsertVaccination, deleteVaccination } from '@/lib/health-record/queries'

async function getChild(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('children')
    .select('id, name, date_of_birth')
    .or(`user_id.eq.${userId},linked_user_ids.cs.{${userId}}`)
    .limit(1)
    .single()
  return data
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const child = await getChild(user.id)
  if (!child) return NextResponse.json({ error: 'No child found' }, { status: 404 })

  try {
    const vaccinations = await getVaccinations(child.id)
    return NextResponse.json({ child, vaccinations })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { vaccine_key, given_date, notes, remove } = await request.json()
  if (!vaccine_key) return NextResponse.json({ error: 'vaccine_key required' }, { status: 400 })

  const child = await getChild(user.id)
  if (!child) return NextResponse.json({ error: 'No child found' }, { status: 404 })

  try {
    if (remove) {
      await deleteVaccination(child.id, vaccine_key)
    } else {
      await upsertVaccination(child.id, user.id, vaccine_key, given_date ?? null, notes ?? null)
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
