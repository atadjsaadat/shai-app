import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('photo') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${Date.now()}.${ext}`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('win-photos')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: signedData } = await admin.storage
    .from('win-photos')
    .createSignedUrl(path, 60 * 60 * 24 * 365) // 1-year signed URL stored with the record

  return NextResponse.json({ path, url: signedData?.signedUrl ?? null })
}
