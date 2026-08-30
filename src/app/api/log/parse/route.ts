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

  // ── Pantry reference intercept — runs before Haiku ──────────────────────
  const PANTRY_TRIGGERS = ['pantry', 'scanned', 'i scanned', 'from the scan', 'saved it', 'the one i saved', 'in my pantry', 'from my pantry', 'from the pantry', 'my pantry', 'scanned product', 'nutritional info for', 'nutrition info for', 'bring up the', 'log the'];
  const lowerMsg = latestUserMessage.toLowerCase();
  const isPantryRef = PANTRY_TRIGGERS.some(t => lowerMsg.includes(t));

  if (isPantryRef && pantryItems.length === 0) {
    return NextResponse.json({
      message: "I can't see your pantry right now — what was the product called? I'll log it accurately for you.",
      foodItems: [],
      clarifyingQuestion: null,
      mealType,
      isHardFoodDay: false,
      complete: false,
    } satisfies ParseApiResponse);
  }

  if (isPantryRef && pantryItems.length > 0) {
    // Try to find the named product directly — no Haiku call needed
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const nMsg = normalize(latestUserMessage);
    const matched = pantryItems.find(p => {
      const nName = normalize(p.product_name);
      const nBrand = p.brand ? normalize(p.brand) : '';
      if (nMsg.includes(nName) || (nBrand && nMsg.includes(nBrand))) return true;
      // word-level: any significant word from product name appears in message
      return nName.split(' ').filter(w => w.length > 3).some(w => nMsg.includes(w));
    });

    if (matched) {
      const displayName = [matched.brand, matched.product_name].filter(Boolean).join(' ');
      return NextResponse.json({
        message: `I found ${displayName} in your pantry — is that the one you're logging?`,
        foodItems: [{
          food_name: matched.product_name,
          serving_size_description: null,
          calories_kcal: null, protein_g: null, carbs_g: null, fat_g: null,
          fibre_g: null, sugar_g: null, saturated_fat_g: null, sodium_mg: null,
          iron_mg: null, calcium_mg: null, vitamin_c_mg: null, vitamin_a_mcg: null,
          vitamin_d_mcg: null, zinc_mg: null, omega3_mg: null, b12_mcg: null,
          b6_mg: null, folate_mcg: null, magnesium_mg: null, potassium_mg: null,
          omega6_mg: null, iodine_mcg: null, selenium_mcg: null, phosphorus_mg: null,
          choline_mg: null, dha_mg: null, vitamin_k_mcg: null,
          confidence_score: 0.95,
        }],
        clarifyingQuestion: null,
        mealType,
        isHardFoodDay: false,
        complete: true,
      } satisfies ParseApiResponse);
    }
    // No direct match — fall through to Haiku with pantry context injected
  }

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
