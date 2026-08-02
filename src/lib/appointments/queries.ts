import { createAdminClient } from '@/lib/supabase/server'
import type { Appointment, CreateAppointmentInput, UpdateAppointmentInput } from './types'

export async function getAppointments(childId: string): Promise<Appointment[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('appointments')
    .select('*')
    .eq('child_id', childId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createAppointment(
  childId: string,
  userId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('appointments')
    .insert({ child_id: childId, user_id: userId, ...input })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAppointment(
  id: string,
  userId: string,
  input: UpdateAppointmentInput,
): Promise<Appointment> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('appointments')
    .update(input)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteAppointment(id: string, userId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('appointments')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}
