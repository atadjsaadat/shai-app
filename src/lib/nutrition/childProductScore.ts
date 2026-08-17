export type ScoreBand = 'good' | 'ok' | 'poor'

export interface ProductScore {
  score: number
  band: ScoreBand
  label: string
}

interface ScoreInputs {
  sugar_g: number | null
  sodium_mg: number | null
  saturated_fat_g: number | null
  fibre_g: number | null
  iron_mg: number | null
  calcium_mg: number | null
  nova_classification: number | null
  additives_n: number | null
  child_age_days: number
}

export function calculateChildProductScore(inputs: ScoreInputs): ProductScore {
  const {
    sugar_g, sodium_mg, saturated_fat_g, fibre_g,
    iron_mg, calcium_mg, nova_classification, additives_n, child_age_days,
  } = inputs

  const ageMonths = child_age_days / 30.44
  const isUnder1 = ageMonths < 12
  const isUnder3 = ageMonths < 36

  let penalties = 0
  let topPenalty = 0
  let topReason = ''

  function addPenalty(amount: number, reason: string) {
    penalties += amount
    if (amount > topPenalty) { topPenalty = amount; topReason = reason }
  }

  // Sugar (per 100g)
  if (sugar_g != null) {
    if (isUnder1) {
      if (sugar_g > 5) addPenalty(35, 'sugar')
      else if (sugar_g > 2) addPenalty(20, 'sugar')
    } else if (isUnder3) {
      if (sugar_g > 15) addPenalty(30, 'sugar')
      else if (sugar_g > 10) addPenalty(20, 'sugar')
      else if (sugar_g > 5) addPenalty(10, 'sugar')
    } else {
      if (sugar_g > 20) addPenalty(30, 'sugar')
      else if (sugar_g > 15) addPenalty(20, 'sugar')
      else if (sugar_g > 10) addPenalty(10, 'sugar')
    }
  }

  // Sodium (mg per 100g) — ESPGHAN thresholds
  if (sodium_mg != null) {
    if (isUnder1) {
      if (sodium_mg > 200) addPenalty(45, 'salt')
      else if (sodium_mg > 100) addPenalty(35, 'salt')
      else if (sodium_mg > 50) addPenalty(20, 'salt')
    } else if (isUnder3) {
      if (sodium_mg > 400) addPenalty(35, 'salt')
      else if (sodium_mg > 200) addPenalty(25, 'salt')
      else if (sodium_mg > 100) addPenalty(15, 'salt')
    } else {
      if (sodium_mg > 600) addPenalty(30, 'salt')
      else if (sodium_mg > 400) addPenalty(20, 'salt')
      else if (sodium_mg > 200) addPenalty(10, 'salt')
    }
  }

  // NOVA classification
  if (nova_classification != null) {
    if (nova_classification === 4) addPenalty(25, 'processing')
    else if (nova_classification === 3) addPenalty(15, 'processing')
    else if (nova_classification === 2) addPenalty(5, 'processing')
  }

  // Additives count
  if (additives_n != null) {
    if (additives_n >= 6) addPenalty(20, 'additives')
    else if (additives_n >= 3) addPenalty(10, 'additives')
    else if (additives_n >= 1) addPenalty(5, 'additives')
  }

  // Saturated fat — full-fat dairy is fine for under-1, so only penalise 12m+
  if (!isUnder1 && saturated_fat_g != null) {
    if (saturated_fat_g > 12) addPenalty(15, 'saturated fat')
    else if (saturated_fat_g > 8) addPenalty(5, 'saturated fat')
  }

  // Bonuses — capped at 15 total
  let ironBonus = 0
  let calciumBonus = 0
  let fibreBonus = 0
  if (iron_mg != null) ironBonus = iron_mg > 4 ? 12 : iron_mg > 2 ? 7 : 0
  if (calcium_mg != null) calciumBonus = calcium_mg > 300 ? 8 : calcium_mg > 150 ? 5 : 0
  if (fibre_g != null) fibreBonus = fibre_g > 4 ? 5 : fibre_g > 2 ? 3 : 0
  const bonus = Math.min(ironBonus + calciumBonus + fibreBonus, 15)

  const score = Math.max(0, Math.min(100, 100 - penalties + bonus))
  const band: ScoreBand = score >= 70 ? 'good' : score >= 40 ? 'ok' : 'poor'

  // One-line label in SHAi voice
  let label: string
  if (band === 'good') {
    if (iron_mg != null && iron_mg > 2) label = 'A good iron source for their age'
    else if (calcium_mg != null && calcium_mg > 150) label = 'Good calcium content for their age'
    else label = 'A solid choice for their age'
  } else if (topReason === 'sugar') {
    label = isUnder1 ? 'High in sugar — best avoided at this age' : 'High in sugar for their age'
  } else if (topReason === 'salt') {
    label = isUnder1 ? 'High in salt — best avoided at this age' : 'High in salt for their age'
  } else if (topReason === 'processing') {
    label = 'Heavily processed — best kept occasional'
  } else if (topReason === 'additives') {
    label = 'Contains several additives — worth keeping occasional'
  } else if (topReason === 'saturated fat') {
    label = 'High in saturated fat for their age'
  } else {
    label = 'Best kept as an occasional choice'
  }

  return { score, band, label }
}
