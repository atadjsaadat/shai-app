import { createAdminClient } from '@/lib/supabase/server'

export interface DistressLogEntry {
  userId: string
  level: 1 | 2 | 3
  languageDetected: string | null
  shaiResponseGiven: string
  resourceSurfaced: boolean
}

export async function logDistressFlag(entry: DistressLogEntry): Promise<void> {
  const admin = createAdminClient()

  const now = new Date().toISOString()

  await admin.from('distress_flags').insert({
    user_id: entry.userId,
    level: entry.level,
    language_detected: entry.languageDetected,
    shai_response_given: entry.shaiResponseGiven,
    resource_surfaced_at: entry.resourceSurfaced ? now : null,
    // Level 3: mark as escalated — delivery pending notification infrastructure
    escalated: entry.level === 3,
    escalation_type: entry.level === 3 ? 'pending_notification_infrastructure' : null,
  })
}
