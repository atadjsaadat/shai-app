import type { OnboardingData } from '@/lib/onboarding/types'

export async function createChildProfile(
  data: OnboardingData
): Promise<{ childId: string | null; error: string | null }> {
  try {
    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    let json: Record<string, unknown> = {}
    try { json = await res.json() } catch { /* non-JSON body */ }
    if (!res.ok) return { childId: null, error: `[${res.status}] ${(json.error as string) ?? res.statusText}` }
    if (!json.childId) return { childId: null, error: `[200] No child ID returned. Response: ${JSON.stringify(json)}` }
    return { childId: json.childId as string, error: null }
  } catch (e) {
    return { childId: null, error: `Network error: ${e instanceof Error ? e.message : String(e)}` }
  }
}

export async function updateResearchConsent(consentDataResearch: boolean): Promise<void> {
  await fetch('/api/auth/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ consentDataResearch }),
  })
}
