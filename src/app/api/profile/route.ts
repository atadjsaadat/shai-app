import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const [profileResult, childResult] = await Promise.all([
    supabase.from('profiles').select('tier, consent_data_research').eq('id', user.id).single(),
    admin.from('children')
      .select('name, date_of_birth, sex, allergies, is_selective_eater, relationship_to_child')
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
  if (typeof body.consent_data_research !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ consent_data_research: body.consent_data_research })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
