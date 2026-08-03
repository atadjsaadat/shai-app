import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  createInvite,
  getPendingInvites,
  getLinkedPartners,
  revokeInvite,
  removeLinkedPartner,
} from '@/lib/invite/queries'

async function getOwnerChild(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('children')
    .select('id, name')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()
  return data ?? null
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const child = await getOwnerChild(user.id)
  if (!child) return NextResponse.json({ error: 'No child found' }, { status: 404 })

  const [pendingInvites, linkedPartners] = await Promise.all([
    getPendingInvites(child.id),
    getLinkedPartners(child.id, user.id),
  ])

  return NextResponse.json({ pendingInvites, linkedPartners, childId: child.id, childName: child.name })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const child = await getOwnerChild(user.id)
  if (!child) return NextResponse.json({ error: 'No child found' }, { status: 404 })

  const origin = req.headers.get('origin') ?? `https://${req.headers.get('host')}`

  try {
    const token = await createInvite(child.id, user.id)
    const link = `${origin}/invite/${token}`
    return NextResponse.json({ token, link })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { token, linkedUserId } = await req.json()

  const child = await getOwnerChild(user.id)
  if (!child) return NextResponse.json({ error: 'No child found' }, { status: 404 })

  try {
    if (token) {
      await revokeInvite(token, user.id)
    } else if (linkedUserId) {
      await removeLinkedPartner(child.id, user.id, linkedUserId)
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
