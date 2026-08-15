export type NotifyType = 'coparent' | 'support_person' | 'clinical'

interface NotifyPayload {
  to: string
  parentName: string
  type: NotifyType
}

export async function sendDistressEmail({ to, parentName, type }: NotifyPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[distress] RESEND_API_KEY not set — skipping email to', to)
    return false
  }

  const messages: Record<NotifyType, { subject: string; text: string }> = {
    coparent: {
      subject: `SHAi — ${parentName} might need some support right now`,
      text: `Hi,\n\nSHAi noticed ${parentName} might be having a really hard time right now.\n\nAre you able to check in with them?\n\n— The SHAi team\n\nIf this is an emergency, please call 112.`,
    },
    support_person: {
      subject: `SHAi — ${parentName} might need some support right now`,
      text: `Hi,\n\nYou've been listed as a support contact for ${parentName}.\n\nSHAi noticed ${parentName} might be having a really hard time right now. Are you able to reach out to them?\n\n— The SHAi team\n\nIf this is an emergency, please call 112.`,
    },
    clinical: {
      subject: `SHAi — Clinical alert: ${parentName}`,
      text: `Hi,\n\nThis is an automated alert from SHAi.\n\n${parentName} has been flagged as potentially in acute distress. Please follow your clinical protocol to make contact.\n\n— The SHAi team`,
    },
  }

  const { subject, text } = messages[type]

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    const { error } = await resend.emails.send({
      from: 'SHAi <noreply@shai.app>',
      to,
      subject,
      text,
    })
    if (error) {
      console.error('[distress] Resend error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[distress] Failed to send email:', err)
    return false
  }
}
