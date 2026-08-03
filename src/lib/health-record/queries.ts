import { createAdminClient } from '@/lib/supabase/server'
import type { VaccinationRecord } from './types'

export async function getVaccinations(childId: string): Promise<VaccinationRecord[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('vaccinations')
    .select('vaccine_key, given_date, notes')
    .eq('child_id', childId)
  if (error) throw error
  return (data ?? []) as VaccinationRecord[]
}

export async function upsertVaccination(
  childId: string,
  userId: string,
  vaccineKey: string,
  givenDate: string | null,
  notes: string | null,
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('vaccinations')
    .upsert(
      { child_id: childId, logged_by_user_id: userId, vaccine_key: vaccineKey, given_date: givenDate, notes },
      { onConflict: 'child_id,vaccine_key' },
    )
  if (error) throw error
}

export async function deleteVaccination(childId: string, vaccineKey: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('vaccinations')
    .delete()
    .eq('child_id', childId)
    .eq('vaccine_key', vaccineKey)
  if (error) throw error
}
