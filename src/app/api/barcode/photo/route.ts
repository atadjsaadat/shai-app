import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { extractAllergensFromIngredients } from '@/lib/barcode/lookup'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { imageBase64, mediaType, barcode } = await req.json()
  if (!imageBase64) return NextResponse.json({ error: 'No image' }, { status: 400 })

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: imageBase64 },
        },
        {
          type: 'text',
          text: `Extract the nutritional information from this nutrition label. Return ONLY valid JSON — use null for any value not clearly visible. All weights must be in the units shown (g, mg, mcg). If sodium is shown in grams convert to mg.

IMPORTANT: Many labels have two columns — "per serving" and "per 100g". You MUST use the PER SERVING column values if it exists. Set serving_size_description to the serving size shown (e.g. "8g", "1 biscuit (8g)", "30ml"). Only use per-100g values if there is no per-serving column at all, in which case set serving_size_description to "100g".

Never mix values from different columns — every nutrient value must come from the same column.

{
  "product_name": null,
  "serving_size_description": null,
  "calories_kcal": null,
  "protein_g": null,
  "carbs_g": null,
  "fat_g": null,
  "fibre_g": null,
  "sugar_g": null,
  "saturated_fat_g": null,
  "sodium_mg": null,
  "iron_mg": null,
  "calcium_mg": null,
  "vitamin_c_mg": null,
  "vitamin_d_mcg": null,
  "vitamin_a_mcg": null,
  "zinc_mg": null,
  "omega3_mg": null
}`,
        },
      ],
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Could not read label' }, { status: 422 })

  let parsed: Record<string, number | string | null>
  try { parsed = JSON.parse(match[0]) } catch { return NextResponse.json({ error: 'Parse failed' }, { status: 422 }) }

  if (!parsed.calories_kcal && !parsed.protein_g && !parsed.carbs_g && !parsed.fat_g) {
    return NextResponse.json({ error: 'No nutrition data found' }, { status: 422 })
  }

  // Write to barcode cache so future scans of this product get real label data
  const servingDesc = parsed.serving_size_description as string | null
  const servingGMatch = servingDesc?.match(/(\d+(?:\.\d+)?)\s*g/i)
  const servingMlMatch = servingDesc?.match(/(\d+(?:\.\d+)?)\s*ml/i)
  const servingG = servingGMatch ? parseFloat(servingGMatch[1]) : null
  const servingMl = servingMlMatch ? parseFloat(servingMlMatch[1]) : null

  if (barcode && parsed.calories_kcal) {
    try {
      const admin = createAdminClient()
      await admin.from('barcode_cache').upsert({
        barcode,
        ...(parsed.product_name ? { product_name: parsed.product_name as string } : {}),
        ...(servingG  != null ? { serving_size_g:  servingG  } : {}),
        ...(servingMl != null ? { serving_size_ml: servingMl } : {}),
        calories_kcal:     parsed.calories_kcal     as number | null,
        protein_g:         parsed.protein_g         as number | null,
        carbs_g:           parsed.carbs_g           as number | null,
        fat_g:             parsed.fat_g             as number | null,
        fibre_g:           parsed.fibre_g           as number | null,
        sugar_g:           parsed.sugar_g           as number | null,
        saturated_fat_g:   parsed.saturated_fat_g   as number | null,
        sodium_mg:         parsed.sodium_mg         as number | null,
        iron_mg:           parsed.iron_mg           as number | null,
        calcium_mg:        parsed.calcium_mg        as number | null,
        vitamin_c_mg:      parsed.vitamin_c_mg      as number | null,
        vitamin_d_mcg:     parsed.vitamin_d_mcg     as number | null,
        vitamin_a_mcg:     parsed.vitamin_a_mcg     as number | null,
        zinc_mg:           parsed.zinc_mg           as number | null,
        omega3_mg:         parsed.omega3_mg         as number | null,
        first_scanned_at:  new Date().toISOString(),
        last_scanned_at:   new Date().toISOString(),
      }, { onConflict: 'barcode' })
    } catch { /* non-fatal — cache is best-effort */ }
  }

  return NextResponse.json({
    item: {
      food_name:               (parsed.product_name as string | null) ?? 'Scanned product',
      serving_size_description: servingG != null ? `${servingG}g` : servingMl != null ? `${servingMl}ml` : (servingDesc ?? null),
      calories_kcal:           parsed.calories_kcal    as number | null,
      protein_g:               parsed.protein_g        as number | null,
      carbs_g:                 parsed.carbs_g          as number | null,
      fat_g:                   parsed.fat_g            as number | null,
      fibre_g:                 parsed.fibre_g          as number | null,
      sugar_g:                 parsed.sugar_g          as number | null,
      saturated_fat_g:         parsed.saturated_fat_g  as number | null,
      sodium_mg:               parsed.sodium_mg        as number | null,
      iron_mg:                 parsed.iron_mg          as number | null,
      calcium_mg:              parsed.calcium_mg       as number | null,
      vitamin_c_mg:            parsed.vitamin_c_mg     as number | null,
      vitamin_d_mcg:           parsed.vitamin_d_mcg    as number | null,
      vitamin_a_mcg:           parsed.vitamin_a_mcg    as number | null,
      zinc_mg:                 parsed.zinc_mg          as number | null,
      omega3_mg:               parsed.omega3_mg        as number | null,
      b12_mcg: null, b6_mg: null, folate_mcg: null, magnesium_mg: null,
      potassium_mg: null, omega6_mg: null, iodine_mcg: null, selenium_mcg: null,
      phosphorus_mg: null, choline_mg: null, dha_mg: null, vitamin_k_mcg: null,
      confidence_score: 0.8,
      data_source: 'barcode' as const,
    },
  })
}
