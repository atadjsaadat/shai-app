import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAnthropicClient } from '@/lib/anthropic/client';
import { buildParserSystemPrompt } from '@/lib/log/prompts';
import { detectDistress } from '@/lib/distress/detect';
import { generateDistressResponse } from '@/lib/distress/respond';
import { logDistressFlag } from '@/lib/distress/log';
import type { ParseApiRequest, ParseApiResponse } from '@/lib/log/types';

export async function POST(req: NextRequest) {
  const { messages, mealType, distressActive, alreadyLogged, childId }: ParseApiRequest & { childId?: string } = await req.json();

  // Soft auth — needed for distress logging and pantry lookup; food parse works without it
  let userId: string | null = null;
  let pantryItems: { product_name: string; brand: string | null }[] = [];
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    if (childId) {
      const { createAdminClient } = await import('@/lib/supabase/server');
      const admin = createAdminClient();
      const { data: profile } = userId
        ? await admin.from('profiles').select('tier').eq('id', userId).single()
        : { data: null };
      const pantryLimit = (profile?.tier ?? 'free') === 'free' ? 30 : 100;
      const { data: scanned } = await admin
        .from('child_scanned_products')
        .select('product_name, brand')
        .eq('child_id', childId)
        .eq('scan_outcome', 'purchased')
        .order('updated_at', { ascending: false })
        .limit(pantryLimit);
      pantryItems = (scanned ?? []).map(r => ({ product_name: r.product_name ?? '', brand: r.brand ?? null })).filter(r => r.product_name);
    }
  } catch { /* proceed without pantry */ }

  const latestUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content ?? '';
  const anthropic = createAnthropicClient();

  // ── Distress intercept ──────────────────────────────────────────────────
  // If parent is already in Level 3 distress mode, skip detection and stay in Sonnet
  if (distressActive) {
    const shaiResponse = await generateDistressResponse(3, messages);

    const flagId = userId ? await logDistressFlag({
      userId,
      level: 3,
      languageDetected: null,
      shaiResponseGiven: shaiResponse,
      resourceSurfaced: true,
    }).catch(() => null) : null;

    return NextResponse.json({
      message: shaiResponse,
      foodItems: [],
      clarifyingQuestion: null,
      mealType,
      isHardFoodDay: false,
      complete: false,
      distressLevel: 3,
      ...(flagId && { distressFlagId: flagId }),
    } satisfies ParseApiResponse);
  }

  // Check the latest user message for distress signals
  const { level, languageDetected } = await detectDistress(latestUserMessage);

  if (level > 0) {
    const shaiResponse = await generateDistressResponse(level as 1 | 2 | 3, messages);
    const resourceSurfaced = level >= 2;

    let flagId: string | null = null;
    if (userId) {
      flagId = await logDistressFlag({
        userId,
        level: level as 1 | 2 | 3,
        languageDetected,
        shaiResponseGiven: shaiResponse,
        resourceSurfaced,
      }).catch(() => null);
    }

    return NextResponse.json({
      message: shaiResponse,
      foodItems: [],
      clarifyingQuestion: null,
      mealType,
      isHardFoodDay: false,
      complete: false,
      distressLevel: level as 1 | 2 | 3,
      ...(flagId && level === 3 && { distressFlagId: flagId }),
    } satisfies ParseApiResponse);
  }

  // ── Normal food parse ───────────────────────────────────────────────────
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: buildParserSystemPrompt(mealType, alreadyLogged, pantryItems.length > 0 ? pantryItems : undefined),
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
