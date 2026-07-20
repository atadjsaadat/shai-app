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
  await fetch('/api/auth/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consentDataResearch }),
  })
}
