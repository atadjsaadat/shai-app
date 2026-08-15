import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendDistressEmail, type NotifyType } from '@/lib/distress/notify'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { flagId, type, consentGiven }: { flagId: string; type: NotifyType; consentGiven: boolean } = await req.json()

  const admin = createAdminClient()

  // Verify the flag belongs to this user
  const { data: flag } = await admin
    .from('distress_flags')
    .select('id, user_id, level, coparent_notified_at, support_person_notified_at, clinical_notified_at')
    .eq('id', flagId)
    .eq('user_id', user.id)
    .single()

  if (!flag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Record in-moment consent refusal without sending
  if (!consentGiven) {
    const consentCol: Record<NotifyType, string> = {
      coparent: 'in_moment_consent_coparent',
      support_person: 'in_moment_consent_support_person',
      clinical: 'in_moment_consent_clinical',
    }
    await admin.from('distress_flags').update({ [consentCol[type]]: false }).eq('id', flagId)
    return NextResponse.json({ sent: false })
  }

  // Get profile and child data to find contact addresses
  const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  const parentName = authUser?.user?.user_metadata?.name ?? 'your partner'

  let to: string | null = null

  if (type === 'coparent') {
    // Find linked co-parent's email via children table
    const { data: child } = await admin
      .from('children')
      .select('linked_user_ids')
      .eq('user_id', user.id)
      .single()

    const linkedIds: string[] = child?.linked_user_ids ?? []
    if (linkedIds.length > 0) {
      const { data: linkedUser } = await admin.auth.admin.getUserById(linkedIds[0])
      to = linkedUser?.user?.email ?? null
    }
  } else if (type === 'support_person') {
    to = profile?.support_person_contact_encrypted ?? null
  } else if (type === 'clinical') {
    // Clinical contact not yet in schema — log intent only
    to = null
  }

  const consentCol: Record<NotifyType, string> = {
    coparent: 'in_moment_consent_coparent',
    support_person: 'in_moment_consent_support_person',
    clinical: 'in_moment_consent_clinical',
  }
  const notifiedCol: Record<NotifyType, string> = {
    coparent: 'coparent_notified_at',
    support_person: 'support_person_notified_at',
    clinical: 'clinical_notified_at',
  }

  const now = new Date().toISOString()
  const update: Record<string, unknown> = {
    [consentCol[type]]: true,
    escalation_type: 'consent_given',
  }

  let sent = false
  if (to) {
    sent = await sendDistressEmail({ to, parentName, type })
    if (sent) update[notifiedCol[type]] = now
  }

  await admin.from('distress_flags').update(update).eq('id', flagId)

  return NextResponse.json({ sent, to: to ? '***' : null })
}
