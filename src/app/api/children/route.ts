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
      allergies: data.allergies ?? [],
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

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const { data: child, error } = await admin
    .from('children')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ childId: null, childName: null })
  return NextResponse.json({ childId: child.id, childName: child.name })
}
