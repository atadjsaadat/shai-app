import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email, password, consentDataResearch, consentMarketing } = await request.json()
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (data.user) {
    const admin = createAdminClient()
    await admin.from('profiles').upsert({
      id: data.user.id,
      consent_data_research: consentDataResearch,
      consent_marketing: consentMarketing,
    })
  }
  return NextResponse.json({ success: true })
}
