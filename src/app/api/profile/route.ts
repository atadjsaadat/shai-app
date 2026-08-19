import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const [profileResult, childResult] = await Promise.all([
    supabase.from('profiles').select('tier, consent_data_research, country, avatar_url').eq('id', user.id).single(),
    admin.from('children')
      .select('name, date_of_birth, sex, allergies, intolerances, is_selective_eater, relationship_to_child')
      .eq('user_id', user.id)
      .limit(1)
      .single(),
  ])

  return NextResponse.json({
    email: user.email ?? null,
    profile: profileResult.data ?? null,
    child: childResult.data ?? null,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const update: Record<string, unknown> = {}
  if (typeof body.consent_data_research === 'boolean') update.consent_data_research = body.consent_data_research
  if (typeof body.country === 'string') update.country = body.country || null
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
