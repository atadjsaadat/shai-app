import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAnthropicClient } from '@/lib/anthropic/client'
import { buildDailyFeedbackPrompt } from '@/lib/log/prompts'
import type { NutrientLine } from '@/lib/log/types'

interface FeedbackRequest {
  childName: string
  ageMonths: number
  nutrients: NutrientLine[]
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { childName, ageMonths, nutrients }: FeedbackRequest = await req.json()

  const anthropic = createAnthropicClient()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: buildDailyFeedbackPrompt(childName, ageMonths, nutrients) }],
  })

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  const feedback = raw.replace(/^#+\s*[^\n]*\n+/g, '').trim()
  return NextResponse.json({ feedback })
}
