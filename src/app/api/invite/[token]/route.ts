import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateInvite, acceptInvite } from '@/lib/invite/queries'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const result = await validateInvite(token)
  return NextResponse.json(result)
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const result = await acceptInvite(token, user.id)
  if (!result.success) {
    return NextResponse.json({ error: result.error, childId: result.childId, childName: result.childName }, { status: 400 })
  }
  return NextResponse.json({ success: true, childId: result.childId, childName: result.childName })
}
