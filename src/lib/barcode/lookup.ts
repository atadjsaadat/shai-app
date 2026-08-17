import { createAdminClient } from '@/lib/supabase/server'
import type { ParsedFoodItem } from '@/lib/log/types'

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'

type Nutriments = Record<string, number | undefined>

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

// OFF stores minerals/sodium in grams; convert to mg
function gToMg(v: number | null): number | null {
  return v != null ? round2(v * 1000) : null
}

function mapOFFToFoodItem(product: Record<string, unknown>, servingG: number | null): ParsedFoodItem {
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
    // Vitamin A/D units are inconsistent in OFF — exclude for safety
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cacheRowToFoodItem(row: Record<string, any>): ParsedFoodItem {
  const servingDesc =
    row.serving_size_g != null ? `${row.serving_size_g}g`
    : row.serving_size_ml != null ? `${row.serving_size_ml}ml`
    : 'per 100g'

  return {
    food_name: row.product_name ?? 'Unknown product',
    serving_size_description: servingDesc,
    calories_kcal: row.calories_kcal,
    protein_g: row.protein_g,
    carbs_g: row.carbs_g,
    fat_g: row.fat_g,
    fibre_g: row.fibre_g,
    sugar_g: row.sugar_g,
    saturated_fat_g: row.saturated_fat_g,
    sodium_mg: row.sodium_mg,
    iron_mg: row.iron_mg,
    calcium_mg: row.calcium_mg,
    vitamin_c_mg: row.vitamin_c_mg,
    vitamin_a_mcg: row.vitamin_a_mcg,
    vitamin_d_mcg: row.vitamin_d_mcg,
    zinc_mg: row.zinc_mg,
    omega3_mg: row.omega3_mg,
    b12_mcg: row.b12_mcg,
    b6_mg: row.b6_mg,
    folate_mcg: row.folate_mcg,
    magnesium_mg: row.magnesium_mg,
    potassium_mg: row.potassium_mg,
    omega6_mg: row.omega6_mg,
    iodine_mcg: row.iodine_mcg,
    selenium_mcg: row.selenium_mcg,
    phosphorus_mg: row.phosphorus_mg,
    choline_mg: row.choline_mg,
    dha_mg: row.dha_mg,
    vitamin_k_mcg: row.vitamin_k_mcg,
    confidence_score: 0.9,
    data_source: 'barcode',
  }
}

export interface BarcodeResult {
  item: ParsedFoodItem
  novaClass: number | null
  additivesN: number | null
}

export async function lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
  const admin = createAdminClient()

  const { data: cached } = await admin
    .from('barcode_cache')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (cached) {
    await admin
      .from('barcode_cache')
      .update({ last_scanned_at: new Date().toISOString(), scan_count: (cached.scan_count ?? 1) + 1 })
      .eq('barcode', barcode)
    return {
      item: cacheRowToFoodItem(cached),
      novaClass: (cached.nova_classification as number | null) ?? null,
      additivesN: (cached.additives_n as number | null) ?? null,
    }
  }

  const res = await fetch(`${OFF_BASE}/${barcode}.json`, {
    headers: { 'User-Agent': 'SHAi-App/1.0 (shai.app)' },
    cache: 'no-store',
  })
  if (!res.ok) return null

  const json = (await res.json()) as { status: number; product?: Record<string, unknown> }
  if (json.status !== 1 || !json.product) return null

  const product = json.product
  const servingG = parseServingGrams(product.serving_size as string | null)
  const item = mapOFFToFoodItem(product, servingG)
  const brand = (product.brands as string | undefined)?.split(',')[0]?.trim() ?? null
  const novaClass = (product.nova_group as number | undefined) ?? null
  const additivesN = (product.additives_n as number | undefined) ?? null

  await admin.from('barcode_cache').insert({
    barcode,
    product_name: item.food_name,
    brand,
    nova_classification: novaClass,
    additives_n: additivesN,
    calories_kcal: item.calories_kcal,
    protein_g: item.protein_g,
    carbs_g: item.carbs_g,
    fat_g: item.fat_g,
    fibre_g: item.fibre_g,
    sugar_g: item.sugar_g,
    saturated_fat_g: item.saturated_fat_g,
    sodium_mg: item.sodium_mg,
    calcium_mg: item.calcium_mg,
    iron_mg: item.iron_mg,
    vitamin_c_mg: item.vitamin_c_mg,
    zinc_mg: item.zinc_mg,
    omega3_mg: item.omega3_mg,
    serving_size_g: servingG,
    allergens: (product.allergens_tags as string[] | undefined) ?? [],
    first_scanned_at: new Date().toISOString(),
    last_scanned_at: new Date().toISOString(),
    scan_count: 1,
  })

  return { item, novaClass, additivesN }
}
