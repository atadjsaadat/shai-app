import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const origin = new URL(request.url).origin
  const redirectTo = `${origin}/auth/callback?next=/reset-password`

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  // Always return success — don't reveal whether the email exists
  if (error) console.error('[forgot-password]', error.message)
  return NextResponse.json({ success: true })
}
