import { createClient } from '@/lib/supabase/client';
import type { OnboardingData } from '@/lib/onboarding/types';

export async function createChildProfile(
  data: OnboardingData
): Promise<{ childId: string | null; error: string | null }> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { childId: null, error: 'Not authenticated' };

  const { data: child, error } = await supabase
    .from('children')
    .insert({
      user_id: userData.user.id,
      name: data.childName ?? '',
      date_of_birth: data.birthMonthYear ?? null,
      sex: data.sex ?? null,
      allergies: data.allergies ?? [],
      is_selective_eater: data.isSelectiveEater ?? false,
      selective_eater_details: data.selectiveEaterDetails ?? null,
      birth_weight_kg: data.birthWeight ?? null,
      relationship_to_child: data.relationshipToChild ?? null,
      dietary_preference: data.dietaryPreference ?? null,
    })
    .select('id')
    .single();

  if (error) return { childId: null, error: error.message };
  return { childId: child.id, error: null };
}

export async function updateResearchConsent(consentDataResearch: boolean): Promise<void> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from('profiles')
    .update({ consent_data_research: consentDataResearch })
    .eq('id', userData.user.id);
}
