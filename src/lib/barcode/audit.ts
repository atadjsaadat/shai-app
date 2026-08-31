import { createAdminClient } from '@/lib/supabase/server'

const OFF_BASE = 'https://world.openfoodfacts.org/api/v2/product'

type FlagReason = 'MACRO_MISMATCH' | 'UNKNOWN_NAME_NOT_IN_OFF' | 'MISSING_CALORIES_NOT_IN_OFF'

export interface AuditSummary {
  checked:        number
  deleted:        number
  nameFixed:      number
  nutrientsFixed: number
  flagged:        number
  alreadyFlagged: number
  errors:         string[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Nutriments = Record<string, any>

function parseServingGrams(s: string | null | undefined): number | null {
  if (!s) return null
  const m = s.match(/(\d+(?:\.\d+)?)\s*g/i)
  return m ? parseFloat(m[1]) : null
}

function getNutrient(n: Nutriments, key: string, servingG: number | null): number | null {
  const perServing = n[`${key}_serving`]
  const per100g    = n[`${key}_100g`]
  if (servingG != null && perServing != null) return perServing
  if (per100g   != null) return servingG != null ? (per100g * servingG) / 100 : per100g
  return null
}

function gToMg(v: number | null): number | null {
  return v != null ? Math.round(v * 1000 * 100) / 100 : null
}

async function fetchOFF(barcode: string) {
  try {
    const res = await fetch(`${OFF_BASE}/${barcode}.json`, {
      headers: { 'User-Agent': 'SHAi-App/1.0 (shai.app)' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await res.json() as { status: number; product?: Record<string, any> }
    if (json.status !== 1 || !json.product) return null

    const p       = json.product
    const n       = (p.nutriments ?? {}) as Nutriments
    const servingG = parseServingGrams(p.serving_size as string | null)

    return {
      product_name:        ((p.product_name ?? p.abbreviated_product_name ?? '') as string).trim() || null,
      brand:               (p.brands as string | undefined)?.split(',')[0]?.trim() ?? null,
      nova_classification: (p.nova_group  as number | undefined) ?? null,
      additives_n:         (p.additives_n as number | undefined) ?? null,
      serving_size_g:      servingG,
      calories_kcal:       getNutrient(n, 'energy-kcal',    servingG),
      protein_g:           getNutrient(n, 'proteins',        servingG),
      carbs_g:             getNutrient(n, 'carbohydrates',   servingG),
      fat_g:               getNutrient(n, 'fat',             servingG),
      fibre_g:             getNutrient(n, 'fiber', servingG) ?? getNutrient(n, 'fibers', servingG),
      sugar_g:             getNutrient(n, 'sugars',          servingG),
      saturated_fat_g:     getNutrient(n, 'saturated-fat',   servingG),
      sodium_mg:           gToMg(getNutrient(n, 'sodium',    servingG)),
      calcium_mg:          gToMg(getNutrient(n, 'calcium',   servingG)),
      iron_mg:             gToMg(getNutrient(n, 'iron',      servingG)),
      vitamin_c_mg:        gToMg(getNutrient(n, 'vitamin-c', servingG)),
      zinc_mg:             gToMg(getNutrient(n, 'zinc',      servingG)),
    }
  } catch { return null }
}

export async function runBarcodeAudit(): Promise<AuditSummary> {
  const admin = createAdminClient()
  const summary: AuditSummary = {
    checked: 0, deleted: 0, nameFixed: 0, nutrientsFixed: 0,
    flagged: 0, alreadyFlagged: 0, errors: [],
  }

  const { data: entries, error: fetchErr } = await admin.from('barcode_cache').select('*')
  if (fetchErr || !entries) {
    summary.errors.push(`fetch cache: ${fetchErr?.message}`)
    return summary
  }
  summary.checked = entries.length

  // Track existing unresolved flags to avoid duplicates
  const { data: existingFlags } = await admin
    .from('barcode_audit_flags')
    .select('barcode, flag_reason')
    .eq('resolved', false)
  const flaggedSet = new Set((existingFlags ?? []).map(f => `${f.barcode}:${f.flag_reason}`))

  for (const row of entries) {
    const barcode = row.barcode as string

    // ── 1. Short barcode — definitely not a real EAN, delete ──────────────────
    if (barcode.length < 8) {
      const { error } = await admin.from('barcode_cache').delete().eq('barcode', barcode)
      if (error) summary.errors.push(`delete ${barcode}: ${error.message}`)
      else summary.deleted++
      continue
    }

    const needsName     = !row.product_name || row.product_name === 'Unknown product'
    const needsCalories = row.calories_kcal == null

    // ── 2 & 3. Missing name or calories — try OFF ─────────────────────────────
    if (needsName || needsCalories) {
      const off = await fetchOFF(barcode)

      if (off) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const patch: Record<string, any> = {}

        if (needsName && off.product_name) {
          patch.product_name = off.product_name
          if (off.brand)                        patch.brand                = off.brand
          if (off.nova_classification != null)  patch.nova_classification  = off.nova_classification
        }

        if (needsCalories && off.calories_kcal != null) {
          patch.calories_kcal   = off.calories_kcal
          patch.protein_g       = off.protein_g       ?? row.protein_g
          patch.carbs_g         = off.carbs_g         ?? row.carbs_g
          patch.fat_g           = off.fat_g           ?? row.fat_g
          patch.fibre_g         = off.fibre_g         ?? row.fibre_g
          patch.sugar_g         = off.sugar_g         ?? row.sugar_g
          patch.saturated_fat_g = off.saturated_fat_g ?? row.saturated_fat_g
          patch.sodium_mg       = off.sodium_mg       ?? row.sodium_mg
          patch.calcium_mg      = off.calcium_mg      ?? row.calcium_mg
          patch.iron_mg         = off.iron_mg         ?? row.iron_mg
          patch.vitamin_c_mg    = off.vitamin_c_mg    ?? row.vitamin_c_mg
          patch.zinc_mg         = off.zinc_mg         ?? row.zinc_mg
        }

        if (Object.keys(patch).length > 0) {
          const { error } = await admin.from('barcode_cache').update(patch).eq('barcode', barcode)
          if (error) {
            summary.errors.push(`update ${barcode}: ${error.message}`)
          } else {
            if (patch.product_name)   summary.nameFixed++
            if (patch.calories_kcal != null) summary.nutrientsFixed++
          }
        }
      } else {
        // OFF has nothing — flag for manual review
        const reason: FlagReason = needsCalories
          ? 'MISSING_CALORIES_NOT_IN_OFF'
          : 'UNKNOWN_NAME_NOT_IN_OFF'
        const key = `${barcode}:${reason}`

        if (!flaggedSet.has(key)) {
          await admin.from('barcode_audit_flags').insert({
            barcode,
            product_name: row.product_name ?? null,
            flag_reason:  reason,
            flag_detail:  needsCalories
              ? 'No calorie data found in OFF — photograph the label'
              : 'Name unresolvable — not in OFF database',
          })
          flaggedSet.add(key)
          summary.flagged++
        } else {
          summary.alreadyFlagged++
        }
      }
      continue
    }

    // ── 4. Macro / calorie sense check ────────────────────────────────────────
    // Fires when all three macros + calories are present and calories >= 10
    const { calories_kcal, protein_g, carbs_g, fat_g } = row
    if (
      calories_kcal != null && calories_kcal >= 10 &&
      protein_g != null && carbs_g != null && fat_g != null
    ) {
      const expected = protein_g * 4 + carbs_g * 4 + fat_g * 9
      const diff     = Math.abs(calories_kcal - expected) / calories_kcal

      if (diff > 0.25) {
        const reason: FlagReason = 'MACRO_MISMATCH'
        const key = `${barcode}:${reason}`

        if (!flaggedSet.has(key)) {
          await admin.from('barcode_audit_flags').insert({
            barcode,
            product_name: row.product_name ?? null,
            flag_reason:  reason,
            flag_detail:  `Stored ${calories_kcal} kcal, macro sum ${Math.round(expected)} kcal (${Math.round(diff * 100)}% off)`,
          })
          flaggedSet.add(key)
          summary.flagged++
        } else {
          summary.alreadyFlagged++
        }
      }
    }
  }

  return summary
}
