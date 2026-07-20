import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/anthropic/client';
import { buildParserSystemPrompt } from '@/lib/log/prompts';
import type { ParseApiRequest, ParseApiResponse } from '@/lib/log/types';

export async function POST(req: NextRequest) {
  const { messages, mealType }: ParseApiRequest = await req.json();

  const anthropic = createClient();

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: buildParserSystemPrompt(mealType),
    messages,
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const jsonMatch = raw.match(/\{[\s\S]*\}/);

  let parsed: ParseApiResponse;
  try {
    if (!jsonMatch) throw new Error('no json');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = {
      message: "Sorry, I didn't quite catch that — could you describe what they had?",
      foodItems: [],
      clarifyingQuestion: null,
      mealType,
      isHardFoodDay: false,
      complete: false,
    };
  }

  return NextResponse.json(parsed);
}
