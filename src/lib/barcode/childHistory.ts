import { createAdminClient } from '@/lib/supabase/server'
import type { ParsedFoodItem } from '@/lib/log/types'

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return 0
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const wordsA = new Set(na.split(/\s+/).filter(w => w.length > 2))
  const wordsB = new Set(nb.split(/\s+/).filter(w => w.length > 2))
  if (wordsA.size === 0 || wordsB.size === 0) return 0
  let overlap = 0
  for (const w of wordsA) { if (wordsB.has(w)) overlap++ }
  return overlap / Math.max(wordsA.size, wordsB.size)
}

export interface ChildScanMatch {
  item: ParsedFoodItem
  brand: string | null
  barcode: string
  novaClass: number | null
  additivesN: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToItem(row: Record<string, any>, productName: string): ParsedFoodItem {
  return {
    food_name: productName,
    serving_size_description: row.serving_size_g ? `${row.serving_size_g}g` : null,
    calories_kcal:   row.calories_kcal   ?? null,
    protein_g:       row.protein_g       ?? null,
    carbs_g:         row.carbs_g         ?? null,
    fat_g:           row.fat_g           ?? null,
    fibre_g:         row.fibre_g         ?? null,
    sugar_g:         row.sugar_g         ?? null,
    saturated_fat_g: row.saturated_fat_g ?? null,
    sodium_mg:       row.sodium_mg       ?? null,
    iron_mg:         row.iron_mg         ?? null,
    calcium_mg:      row.calcium_mg      ?? null,
    vitamin_c_mg:    row.vitamin_c_mg    ?? null,
    vitamin_a_mcg:   row.vitamin_a_mcg   ?? null,
    vitamin_d_mcg:   row.vitamin_d_mcg   ?? null,
    zinc_mg:         row.zinc_mg         ?? null,
    omega3_mg:       row.omega3_mg       ?? null,
    b12_mcg:         row.b12_mcg         ?? null,
    b6_mg:           row.b6_mg           ?? null,
    folate_mcg:      row.folate_mcg      ?? null,
    magnesium_mg:    row.magnesium_mg    ?? null,
    potassium_mg:    row.potassium_mg    ?? null,
    omega6_mg:       row.omega6_mg       ?? null,
    iodine_mcg:      row.iodine_mcg      ?? null,
    selenium_mcg:    row.selenium_mcg    ?? null,
    phosphorus_mg:   row.phosphorus_mg   ?? null,
    choline_mg:      row.choline_mg      ?? null,
    dha_mg:          row.dha_mg          ?? null,
    vitamin_k_mcg:   row.vitamin_k_mcg   ?? null,
    confidence_score: 0.95,
    data_source: 'barcode',
    barcode: row.barcode ?? null,
    brand: row.brand ?? null,
    nova_classification: row.nova_classification ?? null,
    additives_n: row.additives_n ?? null,
  }
}

export async function saveChildScan(
  childId: string,
  barcode: string,
  outcome: 'purchased' | 'rejected' | 'unknown',
  data: { item: ParsedFoodItem; brand: string | null; novaClass: number | null; additivesN: number | null }
): Promise<void> {
  const admin = createAdminClient()
  const { item } = data
  await admin.from('child_scanned_products').upsert({
    child_id:          childId,
    barcode,
    product_name:      item.food_name,
    brand:             data.brand,
    nova_classification: data.novaClass,
    additives_n:       data.additivesN,
    scan_outcome:      outcome,
    calories_kcal:     item.calories_kcal,
    protein_g:         item.protein_g,
    carbs_g:           item.carbs_g,
    fat_g:             item.fat_g,
    fibre_g:           item.fibre_g,
    sugar_g:           item.sugar_g,
    saturated_fat_g:   item.saturated_fat_g,
    sodium_mg:         item.sodium_mg,
    iron_mg:           item.iron_mg,
    calcium_mg:        item.calcium_mg,
    vitamin_c_mg:      item.vitamin_c_mg,
    vitamin_a_mcg:     item.vitamin_a_mcg,
    vitamin_d_mcg:     item.vitamin_d_mcg,
    zinc_mg:           item.zinc_mg,
    omega3_mg:         item.omega3_mg,
    b12_mcg:           item.b12_mcg,
    b6_mg:             item.b6_mg,
    folate_mcg:        item.folate_mcg,
    magnesium_mg:      item.magnesium_mg,
    potassium_mg:      item.potassium_mg,
    omega6_mg:         item.omega6_mg,
    iodine_mcg:        item.iodine_mcg,
    selenium_mcg:      item.selenium_mcg,
    phosphorus_mg:     item.phosphorus_mg,
    choline_mg:        item.choline_mg,
    dha_mg:            item.dha_mg,
    vitamin_k_mcg:     item.vitamin_k_mcg,
    updated_at:        new Date().toISOString(),
  }, { onConflict: 'child_id,barcode' })
}

export async function matchFoodNames(
  childId: string,
  foodNames: string[]
): Promise<Map<string, ChildScanMatch>> {
  const admin = createAdminClient()
  const results = new Map<string, ChildScanMatch>()
  if (foodNames.length === 0) return results

  const [{ data: scanned }, { data: logged }] = await Promise.all([
    admin
      .from('child_scanned_products')
      .select('*')
      .eq('child_id', childId)
      .neq('scan_outcome', 'rejected'),
    admin
      .from('food_logs')
      .select('food_name, brand, barcode, nova_classification, serving_size_description, calories_kcal, protein_g, carbs_g, fat_g, fibre_g, sugar_g, saturated_fat_g, sodium_mg, iron_mg, calcium_mg, vitamin_c_mg, vitamin_a_mcg, vitamin_d_mcg, zinc_mg, omega3_mg, b12_mcg, b6_mg, folate_mcg, magnesium_mg, potassium_mg, omega6_mg, iodine_mcg, selenium_mcg, phosphorus_mg, choline_mg, dha_mg, vitamin_k_mcg, logged_at')
      .eq('child_id', childId)
      .not('barcode', 'is', null)
      .order('logged_at', { ascending: false }),
  ])

  // Candidates: scanned products take priority; deduplicate logged by barcode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidates: Array<{ name: string; brand: string | null; barcode: string; novaClass: number | null; additivesN: number | null; row: Record<string, any> }> = []

  const scannedBarcodes = new Set<string>()
  for (const row of (scanned ?? [])) {
    scannedBarcodes.add(row.barcode)
    candidates.push({ name: row.product_name ?? '', brand: row.brand ?? null, barcode: row.barcode, novaClass: row.nova_classification ?? null, additivesN: row.additives_n ?? null, row })
  }

  const seenLogBarcodes = new Set<string>()
  for (const row of (logged ?? [])) {
    if (!row.barcode || scannedBarcodes.has(row.barcode) || seenLogBarcodes.has(row.barcode)) continue
    seenLogBarcodes.add(row.barcode)
    candidates.push({ name: row.food_name ?? '', brand: row.brand ?? null, barcode: row.barcode, novaClass: (row.nova_classification as number | null) ?? null, additivesN: null, row: { ...row, serving_size_g: null } })
  }

  const THRESHOLD = 0.6

  for (const foodName of foodNames) {
    let bestScore = 0
    let best: (typeof candidates)[0] | null = null

    for (const c of candidates) {
      const score = Math.max(
        similarity(foodName, c.name),
        c.brand ? similarity(foodName, `${c.brand} ${c.name}`) : 0
      )
      if (score > bestScore) { bestScore = score; best = c }
    }

    if (bestScore >= THRESHOLD && best) {
      results.set(foodName, {
        item: rowToItem(best.row, foodName),
        brand: best.brand,
        barcode: best.barcode,
        novaClass: best.novaClass,
        additivesN: best.additivesN,
      })
    }
  }

  return results
}
