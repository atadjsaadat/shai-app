import { createAdminClient } from '@/lib/supabase/server'

// Returns the last 5 journal entries as a formatted system-prompt string, or null if none.
// Called from AI routes to ground SHAI responses in what the parent has shared.
export async function getJournalContext(userId: string, childId?: string | null): Promise<string | null> {
  const admin = createAdminClient()

  let query = admin
    .from('journal_entries')
    .select('content, created_at')
    .eq('user_id', userId)
    .eq('include_in_ai_context', true)
    .order('created_at', { ascending: false })
    .limit(5)

  if (childId) query = query.eq('child_id', childId)

  const { data } = await query
  if (!data || data.length === 0) return null

  const formatted = data
    .map((e) => {
      const d = new Date(e.created_at)
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      return `[${label}] ${e.content}`
    })
    .join('\n')

  return `Recent journal entries from this parent — use these to personalise your tone and mirror back what matters to them:\n${formatted}`
}
