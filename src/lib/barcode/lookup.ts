import { createAdminClient } from '@/lib/supabase/server'
import type { ParsedFoodItem } from '@/lib/log/types'

const OFF_BASE   = 'https://world.openfoodfacts.org/api/v2/product'
const USDA_BASE  = 'https://api.nal.usda.gov/fdc/v1/foods/search'

type Nutriments = Record<string, number | undefined>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord  = Record<string, any>

// ── USDA nutrient ID → ParsedFoodItem field ───────────────────────────────────
// All USDA branded food values are per 100g — we scale by servingSize below
const USDA_NUTRIENT_MAP: Partial<Record<number, keyof ParsedFoodItem>> = {
  1008: 'calories_kcal',
  1003: 'protein_g',
  1005: 'carbs_g',
  1004: 'fat_g',
  1079: 'fibre_g',
  2000: 'sugar_g',
  1258: 'saturated_fat_g',
  1093: 'sodium_mg',
  1087: 'calcium_mg',
  1089: 'iron_mg',
  1162: 'vitamin_c_mg',
  1104: 'vitamin_a_mcg',
  1114: 'vitamin_d_mcg',
  1095: 'zinc_mg',
  1092: 'potassium_mg',
  1178: 'b12_mcg',
  1175: 'b6_mg',
  1190: 'folate_mcg',
  1090: 'magnesium_mg',
  1091: 'phosphorus_mg',
  1103: 'selenium_mcg',
  1100: 'iodine_mcg',
}
// Omega-3 components (ALA + EPA + DHA) summed and converted g → mg
const USDA_OMEGA3_IDS = new Set([1404, 1405, 1406])

// ── Shared helpers ────────────────────────────────────────────────────────────

function round2(v: number | null): number | null {
  return v != null ? Math.round(v * 100) / 100 : null
}

function parseServingGrams(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.match(/(\d+(?:\.\d+)?)\s*g/i)
  return m ? parseFloat(m[1]) : null
}

function emptyItem(): ParsedFoodItem {
  return {
    food_name: '', serving_size_description: null,
    calories_kcal: null, protein_g: null, carbs_g: null, fat_g: null,
    fibre_g: null, sugar_g: null, saturated_fat_g: null, sodium_mg: null,
    iron_mg: null, calcium_mg: null, vitamin_c_mg: null, vitamin_a_mcg: null,
    vitamin_d_mcg: null, zinc_mg: null, omega3_mg: null, b12_mcg: null,
    b6_mg: null, folate_mcg: null, magnesium_mg: null, potassium_mg: null,
    omega6_mg: null, iodine_mcg: null, selenium_mcg: null, phosphorus_mg: null,
    choline_mg: null, dha_mg: null, vitamin_k_mcg: null,
    confidence_score: 0, data_source: 'barcode',
  }
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface BarcodeResult {
  item:       ParsedFoodItem
  novaClass:  number | null
  additivesN: number | null
  brand:      string | null
}

// ── OFF lookup ────────────────────────────────────────────────────────────────

function getNutrient(n: Nutriments, key: string, servingG: number | null): number | null {
  const perServing = n[`${key}_serving`]
  const per100g    = n[`${key}_100g`]
  if (servingG != null && perServing != null) return perServing
  if (per100g   != null) return servingG != null ? (per100g * servingG) / 100 : per100g
  return null
}

function gToMg(v: number | null): number | null {
  return v != null ? round2(v * 1000) : null
}

function mapOFF(product: AnyRecord, servingG: number | null): ParsedFoodItem {
  const n           = (product.nutriments ?? {}) as Nutriments
  const name        = ((product.product_name ?? product.abbreviated_product_name ?? '') as string).trim() || 'Unknown product'
  const servingDesc = (product.serving_size as string | null) ?? (servingG != null ? `${servingG}g` : 'per 100g')

  return {
    food_name:            name,
    serving_size_description: servingDesc,
    calories_kcal:        round2(getNutrient(n, 'energy-kcal', servingG)),
    protein_g:            round2(getNutrient(n, 'proteins',     servingG)),
    carbs_g:              round2(getNutrient(n, 'carbohydrates', servingG)),
    fat_g:                round2(getNutrient(n, 'fat',          servingG)),
    fibre_g:              round2(getNutrient(n, 'fiber',        servingG) ?? getNutrient(n, 'fibers', servingG)),
    sugar_g:              round2(getNutrient(n, 'sugars',       servingG)),
    saturated_fat_g:      round2(getNutrient(n, 'saturated-fat', servingG)),
    sodium_mg:            gToMg(getNutrient(n, 'sodium',       servingG)),
    calcium_mg:           gToMg(getNutrient(n, 'calcium',      servingG)),
    iron_mg:              gToMg(getNutrient(n, 'iron',         servingG)),
    vitamin_c_mg:         gToMg(getNutrient(n, 'vitamin-c',    servingG)),
    zinc_mg:              gToMg(getNutrient(n, 'zinc',         servingG)),
    omega3_mg:            gToMg(getNutrient(n, 'omega-3-fat',  servingG)),
    // Vitamin A/D units inconsistent in OFF — USDA is authoritative for these
    vitamin_a_mcg: null, vitamin_d_mcg: null,
    b12_mcg: null, b6_mg: null, folate_mcg: null, magnesium_mg: null,
    potassium_mg: null, omega6_mg: null, iodine_mcg: null, selenium_mcg: null,
    phosphorus_mg: null, choline_mg: null, dha_mg: null, vitamin_k_mcg: null,
    confidence_score: 0.85,
    data_source: 'barcode',
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

    const product  = json.product
    const servingG = parseServingGrams(product.serving_size as string | null)
    return {
      item:       mapOFF(product, servingG),
      novaClass:  (product.nova_group  as number | undefined) ?? null,
      additivesN: (product.additives_n as number | undefined) ?? null,
      brand:      (product.brands      as string | undefined)?.split(',')[0]?.trim() ?? null,
    }
  } catch { return null }
}

// ── USDA lookup ───────────────────────────────────────────────────────────────

function mapUSDA(food: AnyRecord): ParsedFoodItem {
  const servingG    = typeof food.servingSize === 'number' &&
                      (food.servingSizeUnit as string | null)?.toLowerCase() === 'g'
                      ? food.servingSize as number
                      : null
  const servingDesc = (food.householdServingFullText as string | null)
                      ?? (servingG != null ? `${servingG}g` : 'per 100g')

  const item = { ...emptyItem(), food_name: (food.description as string) || 'Unknown product', serving_size_description: servingDesc, confidence_score: 0.9 }

  let omega3Sum = 0

  for (const fn of ((food.foodNutrients ?? []) as AnyRecord[])) {
    const id    = fn.nutrientId as number
    const value = fn.value     as number | null
    if (value == null) continue

    // Scale per-100g → per-serving
    const scaled = servingG != null ? round2(value * servingG / 100) : round2(value)
    if (scaled == null) continue

    const field = USDA_NUTRIENT_MAP[id]
    if (field) {
      (item as AnyRecord)[field] = scaled
    } else if (USDA_OMEGA3_IDS.has(id)) {
      // ALA/EPA/DHA in g — accumulate then convert to mg
      omega3Sum += value * (servingG != null ? servingG / 100 : 1)
    }
  }

  if (omega3Sum > 0) item.omega3_mg = round2(omega3Sum * 1000)

  return item
}

async function lookupUSDA(barcode: string): Promise<BarcodeResult | null> {
  const apiKey = process.env.USDA_API_KEY
  if (!apiKey) return null

  try {
    const url = `${USDA_BASE}?query=${encodeURIComponent(barcode)}&dataType=Branded&api_key=${apiKey}`
    const res  = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null

    const json  = await res.json() as { foods?: AnyRecord[] }
    const foods = json.foods ?? []

    // Prefer exact UPC match; fall back to first result
    const food = foods.find(f => (f.gtinUpc as string | null)?.replace(/^0+/, '') === barcode.replace(/^0+/, ''))
               ?? foods[0]
    if (!food) return null

    return {
      item:       mapUSDA(food),
      novaClass:  null,
      additivesN: null,
      brand:      (food.brandOwner as string | null) ?? (food.brandName as string | null) ?? null,
    }
  } catch { return null }
}

// ── Merge ─────────────────────────────────────────────────────────────────────
// USDA wins for any nutrient it has (more rigorously verified).
// OFF fills remaining gaps and contributes NOVA / additives.

function merge(usda: BarcodeResult | null, off: BarcodeResult | null): BarcodeResult | null {
  if (!usda && !off) return null
  if (!usda) return off!
  if (!off)  return usda

  const u = usda.item
  const o = off.item

  // USDA wins for any nutrient it has; OFF fills the rest
  const pick = (field: keyof ParsedFoodItem) =>
    (u[field] as number | null) ?? (o[field] as number | null)

  const merged: ParsedFoodItem = {
    food_name:               u.food_name || o.food_name,
    serving_size_description:u.serving_size_description ?? o.serving_size_description,
    confidence_score:        0.95,
    data_source:             'barcode',
    calories_kcal:    pick('calories_kcal'),
    protein_g:        pick('protein_g'),
    carbs_g:          pick('carbs_g'),
    fat_g:            pick('fat_g'),
    fibre_g:          pick('fibre_g'),
    sugar_g:          pick('sugar_g'),
    saturated_fat_g:  pick('saturated_fat_g'),
    sodium_mg:        pick('sodium_mg'),
    iron_mg:          pick('iron_mg'),
    calcium_mg:       pick('calcium_mg'),
    vitamin_c_mg:     pick('vitamin_c_mg'),
    vitamin_a_mcg:    pick('vitamin_a_mcg'),
    vitamin_d_mcg:    pick('vitamin_d_mcg'),
    zinc_mg:          pick('zinc_mg'),
    omega3_mg:        pick('omega3_mg'),
    b12_mcg:          pick('b12_mcg'),
    b6_mg:            pick('b6_mg'),
    folate_mcg:       pick('folate_mcg'),
    magnesium_mg:     pick('magnesium_mg'),
    potassium_mg:     pick('potassium_mg'),
    omega6_mg:        pick('omega6_mg'),
    iodine_mcg:       pick('iodine_mcg'),
    selenium_mcg:     pick('selenium_mcg'),
    phosphorus_mg:    pick('phosphorus_mg'),
    choline_mg:       pick('choline_mg'),
    dha_mg:           pick('dha_mg'),
    vitamin_k_mcg:    pick('vitamin_k_mcg'),
  }

  return {
    item:       merged,
    novaClass:  off.novaClass,   // Only OFF has NOVA
    additivesN: off.additivesN,  // Only OFF has additives count
    brand:      usda.brand ?? off.brand,
  }
}

// ── Cache helpers ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cacheRowToResult(row: AnyRecord): BarcodeResult {
  const servingDesc = row.serving_size_g  != null ? `${row.serving_size_g}g`
                    : row.serving_size_ml != null ? `${row.serving_size_ml}ml`
                    : 'per 100g'
  return {
    item: {
      food_name:            row.product_name ?? 'Unknown product',
      serving_size_description: servingDesc,
      calories_kcal:        row.calories_kcal,
      protein_g:            row.protein_g,
      carbs_g:              row.carbs_g,
      fat_g:                row.fat_g,
      fibre_g:              row.fibre_g,
      sugar_g:              row.sugar_g,
      saturated_fat_g:      row.saturated_fat_g,
      sodium_mg:            row.sodium_mg,
      iron_mg:              row.iron_mg,
      calcium_mg:           row.calcium_mg,
      vitamin_c_mg:         row.vitamin_c_mg,
      vitamin_a_mcg:        row.vitamin_a_mcg,
      vitamin_d_mcg:        row.vitamin_d_mcg,
      zinc_mg:              row.zinc_mg,
      omega3_mg:            row.omega3_mg,
      b12_mcg:              row.b12_mcg,
      b6_mg:                row.b6_mg,
      folate_mcg:           row.folate_mcg,
      magnesium_mg:         row.magnesium_mg,
      potassium_mg:         row.potassium_mg,
      omega6_mg:            row.omega6_mg,
      iodine_mcg:           row.iodine_mcg,
      selenium_mcg:         row.selenium_mcg,
      phosphorus_mg:        row.phosphorus_mg,
      choline_mg:           row.choline_mg,
      dha_mg:               row.dha_mg,
      vitamin_k_mcg:        row.vitamin_k_mcg,
      confidence_score:     0.95,
      data_source:          'barcode',
    },
    novaClass:  (row.nova_classification as number | null) ?? null,
    additivesN: (row.additives_n         as number | null) ?? null,
    brand:      (row.brand               as string | null) ?? null,
  }
}

async function writeToCache(barcode: string, result: BarcodeResult, servingG: number | null = null): Promise<void> {
  try {
    const admin  = createAdminClient()
    const { item, brand, novaClass, additivesN } = result
    await admin.from('barcode_cache').upsert({
      barcode,
      product_name:        item.food_name,
      brand,
      nova_classification: novaClass,
      additives_n:         additivesN,
      serving_size_g:      servingG,
      calories_kcal:       item.calories_kcal,
      protein_g:           item.protein_g,
      carbs_g:             item.carbs_g,
      fat_g:               item.fat_g,
      fibre_g:             item.fibre_g,
      sugar_g:             item.sugar_g,
      saturated_fat_g:     item.saturated_fat_g,
      sodium_mg:           item.sodium_mg,
      calcium_mg:          item.calcium_mg,
      iron_mg:             item.iron_mg,
      vitamin_c_mg:        item.vitamin_c_mg,
      vitamin_a_mcg:       item.vitamin_a_mcg,
      vitamin_d_mcg:       item.vitamin_d_mcg,
      zinc_mg:             item.zinc_mg,
      omega3_mg:           item.omega3_mg,
      b12_mcg:             item.b12_mcg,
      b6_mg:               item.b6_mg,
      folate_mcg:          item.folate_mcg,
      magnesium_mg:        item.magnesium_mg,
      potassium_mg:        item.potassium_mg,
      iodine_mcg:          item.iodine_mcg,
      selenium_mcg:        item.selenium_mcg,
      phosphorus_mg:       item.phosphorus_mg,
      last_scanned_at:     new Date().toISOString(),
      first_scanned_at:    new Date().toISOString(),
      scan_count:          1,
    }, { onConflict: 'barcode' })
  } catch { /* non-fatal */ }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function lookupBarcode(barcode: string): Promise<BarcodeResult | null> {
  const admin = createAdminClient()

  // 1. Our cache first — merged data from both sources, built up over time
  const { data: cached } = await admin
    .from('barcode_cache')
    .select('*')
    .eq('barcode', barcode)
    .single()

  if (cached?.calories_kcal != null) {
    // Update hit count in background — don't await
    admin.from('barcode_cache')
      .update({ last_scanned_at: new Date().toISOString(), scan_count: (cached.scan_count ?? 1) + 1 })
      .eq('barcode', barcode)
      .then(() => {})
    return cacheRowToResult(cached)
  }

  // 2. USDA + OFF in parallel — best of both sources merged
  const [usdaResult, offResult] = await Promise.all([
    lookupUSDA(barcode),
    lookupOFF(barcode),
  ])

  const merged = merge(usdaResult, offResult)
  if (!merged) return null

  const servingG = parseServingGrams(merged.item.serving_size_description)
  await writeToCache(barcode, merged, servingG)

  return merged
}
