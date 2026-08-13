import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { OnboardingData } from '@/lib/onboarding/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const data: OnboardingData = await request.json()

  const admin = createAdminClient()
  const { data: child, error } = await admin
    .from('children')
    .insert({
      user_id: user.id,
      name: data.childName ?? '',
      date_of_birth: data.birthMonthYear ?? null,
      sex: data.sex ?? null,
      allergies: (data.allergies ?? []).map((a: string) => a.trim()).filter(Boolean),
      is_selective_eater: data.isSelectiveEater ?? false,
      selective_eater_details: data.selectiveEaterDetails ?? null,
      birth_weight_kg: data.birthWeight ?? null,
      relationship_to_child: data.relationshipToChild ?? null,
      dietary_preference: data.dietaryPreference ?? null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ childId: child.id })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  if (!Array.isArray(body.allergies) || !Array.isArray(body.intolerances)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('children')
    .update({
      allergies: body.allergies.map((a: string) => a.trim()).filter(Boolean),
      intolerances: body.intolerances.map((a: string) => a.trim()).filter(Boolean),
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('id, name, date_of_birth')
    .or(`user_id.eq.${user.id},linked_user_ids.cs.{${user.id}}`)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (!child) return NextResponse.json({ childId: null, childName: null, childDob: null })
  return NextResponse.json({ childId: child.id, childName: child.name, childDob: child.date_of_birth })
}
