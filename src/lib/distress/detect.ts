import { createClient } from '@/lib/anthropic/client'

export type DistressLevel = 0 | 1 | 2 | 3

export interface DistressCheck {
  level: DistressLevel
  languageDetected: string | null
}

// Fast keyword pre-check — if no signal, skip Haiku entirely
const DISTRESS_PATTERNS = [
  /\b(kill|harm|hurt)\s+(my)?self/i,
  /want\s+to\s+die/i,
  /can't\s+go\s+on/i,
  /end\s+it\s+(all)?/i,
  /suicid/i,
  /not\s+worth\s+(it|living)/i,
  /no\s+reason\s+to\s+live/i,
  /can'?t\s+cope/i,
  /can'?t\s+do\s+this\s+(any)?more/i,
  /falling\s+apart/i,
  /breaking\s+down/i,
  /\b(hopeless|helpless|desperate)\b/i,
  /rock\s+bottom/i,
  /breaking\s+point/i,
  /\b(overwhelmed|struggling|exhausted|stressed|anxious)\b/i,
  /\btoo\s+much\b/i,
  /losing\s+my\s+mind/i,
  /at\s+my\s+limit/i,
  /\bso\s+(tired|hard|sad|scared|alone)\b/i,
  /not\s+coping/i,
]

function hasDistressSignal(text: string): boolean {
  return DISTRESS_PATTERNS.some(p => p.test(text))
}

export async function detectDistress(latestMessage: string): Promise<DistressCheck> {
  if (!hasDistressSignal(latestMessage)) {
    return { level: 0, languageDetected: null }
  }

  const anthropic = createClient()

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      system: `You are a safety classifier for a parent wellbeing system inside a child nutrition app.

Classify the parent's message for signs of emotional distress.

LEVELS:
0 = No distress. Normal food or app message.
1 = Mild stress or tiredness. Passing comment about finding things hard. Parent seems to be coping.
2 = Struggling significantly. "Can't cope", "can't do this anymore", "falling apart", hopelessness, feeling trapped.
3 = Acute distress or crisis. Any suggestion of self-harm, harm to the child, suicidal ideation, or genuine emergency.

When uncertain between levels, choose the higher level.

Respond with JSON only, no other text:
{"level": 0, "detected_language": null}`,
      messages: [{ role: 'user', content: latestMessage }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(match?.[0] ?? '{}')

    return {
      level: ([0, 1, 2, 3].includes(parsed.level) ? parsed.level : 0) as DistressLevel,
      languageDetected: parsed.detected_language ?? null,
    }
  } catch {
    // On error, fail safe — treat as level 0 to avoid blocking food logging
    return { level: 0, languageDetected: null }
  }
}
