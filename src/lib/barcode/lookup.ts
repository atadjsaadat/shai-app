import { createAdminClient } from '@/lib/supabase/server'
import type { ParsedFoodItem } from '@/lib/log/types'

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'
const NX_ITEM_URL = 'https://trackapi.nutritionix.com/v2/search/item'

// ── Type helpers ──────────────────────────────────────────────────────────────

type Nutriments = Record<string, number | undefined>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

// ── OFF helpers ───────────────────────────────────────────────────────────────

function getNutrient(n: Nutriments, key: string, servingG: number | null): number | null {
  const perServing = n[`${key}_serving`]
  const per100g = n[`${key}_100g`]
  if (servingG != null && perServing != null) return perServing
  if (per100g != null) return servingG != null ? (per100g * servingG) / 100 : per100g
  return null
}

function parseServingGrams(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.match(/(\d+(?:\.\d+)?)\s*g/i)
  return m ? parseFloat(m[1]) : null
}

function round2(v: number | null): number | null {
  return v != null ? Math.round(v * 100) / 100 : null
}

function gToMg(v: number | null): number | null {
  return v != null ? round2(v * 1000) : null
}

function mapOFFToFoodItem(product: AnyRecord, servingG: number | null): ParsedFoodItem {
  const n = (product.nutriments ?? {}) as Nutriments
  const name = ((product.product_name ?? product.abbreviated_product_name ?? '') as string).trim() || 'Unknown product'
  const servingDesc = (product.serving_size as string | null) ?? (servingG != null ? `${servingG}g` : 'per 100g')

  return {
    food_name: name,
    serving_size_description: servingDesc,
    calories_kcal: round2(getNutrient(n, 'energy-kcal', servingG)),
    protein_g: round2(getNutrient(n, 'proteins', servingG)),
    carbs_g: round2(getNutrient(n, 'carbohydrates', servingG)),
    fat_g: round2(getNutrient(n, 'fat', servingG)),
    fibre_g: round2(getNutrient(n, 'fiber', servingG) ?? getNutrient(n, 'fibers', servingG)),
    sugar_g: round2(getNutrient(n, 'sugars', servingG)),
    saturated_fat_g: round2(getNutrient(n, 'saturated-fat', servingG)),
    sodium_mg: gToMg(getNutrient(n, 'sodium', servingG)),
    calcium_mg: gToMg(getNutrient(n, 'calcium', servingG)),
    iron_mg: gToMg(getNutrient(n, 'iron', servingG)),
    vitamin_c_mg: gToMg(getNutrient(n, 'vitamin-c', servingG)),
    zinc_mg: gToMg(getNutrient(n, 'zinc', servingG)),
    omega3_mg: gToMg(getNutrient(n, 'omega-3-fat', servingG)),
    // Vitamin A/D units are inconsistent in OFF — excluded for safety
    vitamin_a_mcg: null,
    vitamin_d_mcg: null,
    b12_mcg: null,
    b6_mg: null,
    folate_mcg: null,
    magnesium_mg: null,
    potassium_mg: null,
    omega6_mg: null,
    iodine_mcg: null,
    selenium_mcg: null,
    phosphorus_mg: null,
    choline_mg: null,
    dha_mg: null,
    vitamin_k_mcg: null,
    confidence_score: 0.85,
    data_source: 'barcode',
  }
}

// ── Nutritionix mapper ────────────────────────────────────────────────────────

function mapNutritionixToFoodItem(food: AnyRecord): ParsedFoodItem {
  const servingDesc = food.serving_qty && food.serving_unit
    ? `${food.serving_qty} ${food.serving_unit}`
    : food.serving_weight_grams != null
    ? `${food.serving_weight_grams}g`
    : 'per serving'

  return {
    food_name: (food.food_name as string | null) ?? 'Unknown product',
    serving_size_description: servingDesc as string,
    calories_kcal:   (food.nf_calories             as number | null) ?? null,
    protein_g:       (food.nf_protein               as number | null) ?? null,
    carbs_g:         (food.nf_total_carbohydrate    as number | null) ?? null,
    fat_g:           (food.nf_total_fat             as number | null) ?? null,
    fibre_g:         (food.nf_dietary_fiber         as number | null) ?? null,
    sugar_g:         (food.nf_sugars                as number | null) ?? null,
    saturated_fat_g: (food.nf_saturated_fat         as number | null) ?? null,
    sodium_mg:       (food.nf_sodium                as number | null) ?? null,
    potassium_mg:    (food.nf_potassium             as number | null) ?? null,
    phosphorus_mg:   (food.nf_p                     as number | null) ?? null,
    // Not provided by Nutritionix branded item endpoint
    iron_mg: null, calcium_mg: null, vitamin_c_mg: null,
    vitamin_a_mcg: null, vitamin_d_mcg: null, zinc_mg: null,
    omega3_mg: null, b12_mcg: null, b6_mg: null, folate_mcg: null,
    magnesium_mg: null, omega6_mg: null, iodine_mcg: null,
    selenium_mcg: null, choline_mg: null, dha_mg: null, vitamin_k_mcg: null,
    confidence_score: 0.9,
    data_source: 'barcode',
  }
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface BarcodeResult {
  item: ParsedFoodItem
  novaClass: number | null
  additivesN: number | null
  brand: string | null
}

// ── Internal lookup functions ─────────────────────────────────────────────────

async function lookupNutritionix(barcode: string): Promise<BarcodeResult | null> {
  const appId  = process.env.NUTRITIONIX_APP_ID
  const appKey = process.env.NUTRITIONIX_APP_KEY
  if (!appId || !appKey) return null

  try {
    const res = await fetch(`${NX_ITEM_URL}?upc=${encodeURIComponent(barcode)}`, {
      headers: {
        'x-app-id':          appId,
        'x-app-key':         appKey,
        'x-remote-user-id':  '0',
      },
      cache: 'no-store',
    })
    if (!res.ok) return null

    const json = await res.json() as { foods?: AnyRecord[] }
    if (!json.foods?.length) return null

    const food = json.foods[0]
    // Only accept if calories are present — otherwise fall through to OFF
    if (food.nf_calories == null) return null

    return {
      item:       mapNutritionixToFoodItem(food),
      novaClass:  null,
      additivesN: null,
      brand:      (food.brand_name as string | null) ?? null,
    }
  } catch {
    return null
  }
}

async function lookupOFF(barcode: string): Promise<BarcodeResult | null> {
  try {
    const res = await fetch(`${OFF_BASE}/${barcode}.json`, {
      headers: { 'User-Agent': 'SHAi-App/1.0 (shai.app)' },
      cache: 'no-store',
    })
    if (!res.ok) return null

    const json = await res.json() as { status: number; product?: AnyRecord }
    if (json.status !== 1 || !json.product) return null

    const product = json.product
    const servingG = parseServingGrams(product.serving_size as string | null)
    return {
      item:       mapOFFToFoodItem(product, servingG),
      novaClass:  (product.nova_group  as number | undefined) ?? null,
      additivesN: (product.additives_n as number | undefined) ?? null,
      brand:      (product.brands      as string | undefined)?.split(',')[0]?.trim() ?? null,
    }
  } catch {
    return null
  }
}

async function writeToCache(barcode: string, result: BarcodeResult, servingG: number | null = null): Promise<void> {
  try {
    const admin = createAdminClient()
    const { item, brand, novaClass, additivesN } = result
    await admin.from('barcode_cache').upsert({
      barcode,
      product_name:      item.food_name,
      brand,
      nova_classification: novaClass,
      additives_n:       additivesN,
      serving_size_g:    servingG,
      calories_kcal:     item.calories_kcal,
      protein_g:         item.protein_g,
      carbs_g:           item.carbs_g,
      fat_g:             item.fat_g,
      fibre_g:           item.fibre_g,
      sugar_g:           item.sugar_g,
      saturated_fat_g:   item.saturated_fat_g,
      sodium_mg:         item.sodium_mg,
      calcium_mg:        item.calcium_mg,
      iron_mg:           item.iron_mg,
      vitamin_c_mg:      item.vitamin_c_mg,
      zinc_mg:           item.zinc_mg,
      omega3_mg:         item.omega3_mg,
      potassium_mg:      item.potassium_mg,
      phosphorus_mg:     item.phosphorus_mg,
      last_scanned_at:   new Date().toISOString(),
      first_scanned_at:  new Date().toISOString(),
      scan_count:        1,
    }, { onConflict: 'barcode' })
  } catch { /* non-fatal — cache is best-effort */ }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
  // 1. Nutritionix — best data quality for branded products
  const nxResult = await lookupNutritionix(barcode)
  if (nxResult) {
    await writeToCache(barcode, nxResult)
    return nxResult
  }

  // 2. Open Food Facts — broader coverage, fallback
  const offResult = await lookupOFF(barcode)
  if (offResult) {
    const servingG = parseServingGrams(offResult.item.serving_size_description)
    await writeToCache(barcode, offResult, servingG)
    return offResult
  }

  return null
}
