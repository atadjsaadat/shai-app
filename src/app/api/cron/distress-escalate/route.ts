import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendDistressEmail } from '@/lib/distress/notify'

// Vercel Cron: runs every minute
// Cron expression in vercel.json: "* * * * *"
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const escalated: string[] = []

  // Find Level 3 flags needing escalation
  const { data: flags } = await admin
    .from('distress_flags')
    .select('id, user_id, coparent_notified_at, coparent_responded_at, support_person_notified_at, support_person_responded_at, clinical_notified_at, in_moment_consent_coparent, in_moment_consent_support_person, in_moment_consent_clinical')
    .eq('level', 3)
    .eq('escalated', true)

  if (!flags?.length) return NextResponse.json({ escalated })

  for (const flag of flags) {
    const coparentNotified = flag.coparent_notified_at ? new Date(flag.coparent_notified_at) : null
    const supportNotified = flag.support_person_notified_at ? new Date(flag.support_person_notified_at) : null

    // 15 min after coparent notified with no response → escalate to support person
    const shouldNotifySupport =
      coparentNotified &&
      !flag.coparent_responded_at &&
      !flag.support_person_notified_at &&
      flag.in_moment_consent_support_person &&
      now.getTime() - coparentNotified.getTime() > 15 * 60 * 1000

    // 5 min after support person notified with no response → escalate to clinical
    const shouldNotifyClinical =
      supportNotified &&
      !flag.support_person_responded_at &&
      !flag.clinical_notified_at &&
      flag.in_moment_consent_clinical &&
      now.getTime() - supportNotified.getTime() > 5 * 60 * 1000

    if (shouldNotifySupport) {
      const { data: profile } = await admin.from('profiles').select('support_person_contact_encrypted').eq('id', flag.user_id).single()
      const { data: authUser } = await admin.auth.admin.getUserById(flag.user_id)
      const parentName = authUser?.user?.user_metadata?.name ?? 'a parent'
      const to = profile?.support_person_contact_encrypted

      if (to) {
        const sent = await sendDistressEmail({ to, parentName, type: 'support_person' })
        if (sent) {
          await admin.from('distress_flags').update({ support_person_notified_at: now.toISOString() }).eq('id', flag.id)
          escalated.push(`${flag.id}:support_person`)
        }
      }
    }

    if (shouldNotifyClinical) {
      const { data: authUser } = await admin.auth.admin.getUserById(flag.user_id)
      const parentName = authUser?.user?.user_metadata?.name ?? 'a parent'
      // Clinical contact email would come from a clinicians table (v2) — log intent for now
      console.log(`[distress-cron] Clinical escalation needed for flag ${flag.id}, parent ${parentName}`)
      await admin.from('distress_flags').update({ clinical_notified_at: now.toISOString() }).eq('id', flag.id)
      escalated.push(`${flag.id}:clinical_logged`)
    }
  }

  return NextResponse.json({ escalated, checked: flags.length })
}
