import Anthropic from '@anthropic-ai/sdk'
import { getOnboardingSystemPrompt, type ApiMessage } from '@/lib/ai/onboarding'

const client = new Anthropic()

export async function POST(request: Request) {
  const { messages }: { messages: ApiMessage[] } = await request.json()

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: getOnboardingSystemPrompt(),
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
