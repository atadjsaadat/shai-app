import { createClient } from '@/lib/supabase/client'
import type { OnboardingData } from '@/lib/onboarding/types'

export async function createChildProfile(
  data: OnboardingData
): Promise<{ childId: string | null; error: string | null }> {
  const res = await fetch('/api/children', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const json = await res.json()
  if (!res.ok) return { childId: null, error: json.error ?? 'Failed to save child profile.' }
  return { childId: json.childId, error: null }
}

export async function updateResearchConsent(consentDataResearch: boolean): Promise<void> {
  const supabase = createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) return

  await supabase
    .from('profiles')
    .update({ consent_data_research: consentDataResearch })
    .eq('id', userData.user.id)
}
