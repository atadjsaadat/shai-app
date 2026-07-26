import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAnthropicClient } from '@/lib/anthropic/client'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { text } = await req.json()
  if (!text?.trim()) return NextResponse.json({ text: '' })

  const anthropic = createAnthropicClient()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    messages: [{
      role: 'user',
      content: `Clean up this voice-transcribed text. Add natural punctuation (full stops, commas, question marks) based on the rhythm and meaning of the speech. Capitalise the start of each sentence. Fix obvious speech recognition errors where the intended word is clear from context. Do not change the meaning, add content, or summarise. Return only the cleaned text — no explanation, no quotes, nothing else.\n\n${text}`,
    }],
  })

  const cleaned = response.content[0].type === 'text' ? response.content[0].text.trim() : text
  return NextResponse.json({ text: cleaned })
}
