import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('avatar') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/avatar.${ext}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signedData } = await admin.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  const avatarUrl = signedData?.signedUrl ?? null

  await admin.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id)

  return NextResponse.json({ url: avatarUrl })
}
