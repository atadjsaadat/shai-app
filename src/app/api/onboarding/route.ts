import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import {
  getOnboardingSystemPrompt,
  INITIAL_COLLECTED,
  type ApiMessage,
  type OnboardingApiResponse,
} from '@/lib/ai/onboarding'

const client = new Anthropic()

export async function POST(request: Request) {
  const { messages }: { messages: ApiMessage[] } = await request.json()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: getOnboardingSystemPrompt(),
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const parsed: OnboardingApiResponse = JSON.parse(text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({
      message: text || "Sorry, I missed that — could you say that again?",
      collected: INITIAL_COLLECTED,
      complete: false,
    } satisfies OnboardingApiResponse)
  }
}
