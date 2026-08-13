import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/anthropic/client';
import { buildSystemPrompt } from '@/lib/onboarding/prompts';
import type { ChatApiRequest, ChatApiResponse } from '@/lib/onboarding/types';

export async function POST(req: NextRequest) {
  const body: ChatApiRequest = await req.json();
  const { messages, collected } = body;

  const anthropic = createClient();

  let response
  try {
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: buildSystemPrompt(collected),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
  } catch {
    return NextResponse.json({ message: "Sorry, I'm having a moment — could you try that again?", collected: {}, complete: false });
  }

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';

  let parsed: ChatApiResponse;
  // Extract the JSON object from anywhere in the response — Sonnet sometimes
  // prepends conversational text before the JSON object despite instructions.
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  try {
    if (!jsonMatch) throw new Error('no json found');
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    parsed = { message: raw.replace(/\{[\s\S]*\}/, '').trim() || raw, collected: {}, complete: false };
  }

  return NextResponse.json(parsed);
}
