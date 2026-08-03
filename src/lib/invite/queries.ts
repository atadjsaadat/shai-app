import { createAdminClient } from '@/lib/supabase/server'

export interface PendingInvite {
  token: string
  created_at: string
  expires_at: string
}

export interface LinkedPartner {
  userId: string
  email: string
}

export async function createInvite(childId: string, userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('child_invites')
    .insert({ child_id: childId, invited_by_user_id: userId })
    .select('token')
    .single()
  if (error) throw error
  return data.token
}

export async function getInviteByToken(token: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('child_invites')
    .select('id, child_id, invited_by_user_id, accepted_by_user_id, expires_at, children(name, id)')
    .eq('token', token)
    .single()
  return data ?? null
}

export async function validateInvite(token: string): Promise<{
  valid: boolean
  childName?: string
  childId?: string
  inviterEmail?: string
  alreadyAccepted?: boolean
  error?: string
}> {
  const admin = createAdminClient()
  const invite = await getInviteByToken(token)
  if (!invite) return { valid: false, error: 'Invite not found.' }
  if (new Date(invite.expires_at) < new Date()) return { valid: false, error: 'This invite has expired.' }
  if (invite.accepted_by_user_id) return { valid: false, alreadyAccepted: true, error: 'This invite has already been used.' }

  const raw = invite.children
  const child = (Array.isArray(raw) ? raw[0] : raw) as { name: string; id: string } | null
  const { data: inviterData } = await admin.auth.admin.getUserById(invite.invited_by_user_id)

  return {
    valid: true,
    childName: child?.name ?? '',
    childId: child?.id ?? '',
    inviterEmail: inviterData?.user?.email ?? '',
  }
}

export async function acceptInvite(token: string, userId: string): Promise<{ success: boolean; error?: string; childId?: string; childName?: string }> {
  const admin = createAdminClient()
  const invite = await getInviteByToken(token)

  if (!invite) return { success: false, error: 'Invite not found.' }
  if (new Date(invite.expires_at) < new Date()) return { success: false, error: 'This invite has expired.' }
  if (invite.accepted_by_user_id) return { success: false, error: 'This invite has already been used.' }
  if (invite.invited_by_user_id === userId) return { success: false, error: 'You cannot accept your own invite.' }

  const { data: child } = await admin
    .from('children')
    .select('id, name, linked_user_ids')
    .eq('id', invite.child_id)
    .single()

  if (!child) return { success: false, error: 'Child profile not found.' }

  const linked: string[] = child.linked_user_ids ?? []
  if (linked.includes(userId)) return { success: false, error: 'You already have access to this profile.', childId: child.id, childName: child.name }
  if (linked.length >= 3) return { success: false, error: 'This profile already has the maximum number of partners (3).' }

  const { error: updateError } = await admin
    .from('children')
    .update({ linked_user_ids: [...linked, userId] })
    .eq('id', invite.child_id)

  if (updateError) return { success: false, error: 'Something went wrong. Please try again.' }

  await admin
    .from('child_invites')
    .update({ accepted_by_user_id: userId })
    .eq('token', token)

  return { success: true, childId: child.id, childName: child.name }
}

export async function getPendingInvites(childId: string): Promise<PendingInvite[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('child_invites')
    .select('token, created_at, expires_at')
    .eq('child_id', childId)
    .is('accepted_by_user_id', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return (data ?? []) as PendingInvite[]
}

export async function revokeInvite(token: string, userId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('child_invites')
    .delete()
    .eq('token', token)
    .eq('invited_by_user_id', userId)
}

export async function getLinkedPartners(childId: string, ownerUserId: string): Promise<LinkedPartner[]> {
  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('linked_user_ids')
    .eq('id', childId)
    .eq('user_id', ownerUserId)
    .single()

  const ids: string[] = child?.linked_user_ids ?? []
  if (ids.length === 0) return []

  const partners: LinkedPartner[] = []
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id)
    if (data?.user) {
      partners.push({ userId: id, email: data.user.email ?? id })
    }
  }
  return partners
}

export async function removeLinkedPartner(childId: string, ownerUserId: string, linkedUserId: string): Promise<void> {
  const admin = createAdminClient()
  const { data: child } = await admin
    .from('children')
    .select('linked_user_ids')
    .eq('id', childId)
    .eq('user_id', ownerUserId)
    .single()

  if (!child) return
  const updated = (child.linked_user_ids ?? []).filter((id: string) => id !== linkedUserId)
  await admin
    .from('children')
    .update({ linked_user_ids: updated })
    .eq('id', childId)
}
