'use server'

import { createAdminClient } from '@/lib/supabase/server'

export type WaitlistActionState = {
  success: boolean
  message: string
}

export async function joinWaitlist(
  _prevState: WaitlistActionState,
  formData: FormData
): Promise<WaitlistActionState> {
  const email = (formData.get('email') as string | null)?.toLowerCase().trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, message: 'Please enter a valid email address.' }
  }

  const { error } = await createAdminClient()
    .from('waitlist')
    .insert({ email, source: 'waitlist_page' })

  if (error) {
    if (error.code === '23505') {
      return { success: true, message: "You're already on the list — we'll be in touch!" }
    }
    return { success: false, message: 'Something went wrong. Please try again.' }
  }

  return { success: true, message: "You're on the list! We'll let you know when SHAI is ready." }
}
