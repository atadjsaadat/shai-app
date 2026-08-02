import { createAdminClient } from '@/lib/supabase/server'
import type { BabyBookEntry, CreateMilestoneInput, UpdateMilestoneInput } from './types'

export async function getMilestones(childId: string): Promise<BabyBookEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('baby_book')
    .select('*')
    .eq('child_id', childId)
    .order('milestone_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as BabyBookEntry[]
}

export async function createMilestone(
  childId: string,
  userId: string,
  childDateOfBirth: string | null,
  input: CreateMilestoneInput,
): Promise<BabyBookEntry> {
  const admin = createAdminClient()
  const child_age_days = childDateOfBirth
    ? Math.floor((new Date(input.milestone_date).getTime() - new Date(childDateOfBirth).getTime()) / 86_400_000)
    : null
  const { data, error } = await admin
    .from('baby_book')
    .insert({
      child_id: childId,
      logged_by_user_id: userId,
      milestone_date: input.milestone_date,
      milestone_type: input.milestone_type,
      title: input.title,
      note: input.note ?? null,
      child_age_days,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as BabyBookEntry
}

export async function updateMilestone(
  id: string,
  userId: string,
  input: UpdateMilestoneInput,
): Promise<BabyBookEntry> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('baby_book')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('logged_by_user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data as BabyBookEntry
}

export async function deleteMilestone(id: string, userId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('baby_book')
    .delete()
    .eq('id', id)
    .eq('logged_by_user_id', userId)
  if (error) throw error
}
