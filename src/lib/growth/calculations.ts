import {
  KEY_AGES,
  PercentileBands,
  WFA_BOYS, WFA_GIRLS,
  HFA_BOYS, HFA_GIRLS,
  HCFA_BOYS, HCFA_GIRLS,
} from './who-data'

function getTable(sex: string, type: 'weight' | 'height' | 'head'): PercentileBands {
  if (type === 'weight') return sex === 'male' ? WFA_BOYS : WFA_GIRLS
  if (type === 'height') return sex === 'male' ? HFA_BOYS : HFA_GIRLS
  return sex === 'male' ? HCFA_BOYS : HCFA_GIRLS
}

// Linear interpolation between the two nearest key ages
function interpolateBands(ageMonths: number, table: PercentileBands): Record<string, number> {
  const clamped = Math.max(0, Math.min(60, ageMonths))
  let lo = 0
  for (let i = 0; i < KEY_AGES.length - 1; i++) {
    if (KEY_AGES[i] <= clamped && clamped <= KEY_AGES[i + 1]) { lo = i; break }
    if (i === KEY_AGES.length - 2) lo = i
  }
  const hi = Math.min(lo + 1, KEY_AGES.length - 1)
  const span = KEY_AGES[hi] - KEY_AGES[lo]
  const t = span === 0 ? 0 : (clamped - KEY_AGES[lo]) / span

  const result: Record<string, number> = {}
  for (const k of ['p3', 'p15', 'p50', 'p85', 'p97'] as const) {
    result[k] = table[k][lo] + t * (table[k][hi] - table[k][lo])
  }
  return result
}

// Returns a 0-100 percentile estimate using linear interpolation between WHO bands
export function calcPercentile(
  value: number,
  sex: string,
  ageMonths: number,
  type: 'weight' | 'height' | 'head',
): number {
  const table = getTable(sex, type)
  const b = interpolateBands(ageMonths, table)

  if (value <= b.p3)  return Math.max(0, 3 * (value / b.p3))
  if (value <= b.p15) return 3  + ((value - b.p3)  / (b.p15 - b.p3))  * 12
  if (value <= b.p50) return 15 + ((value - b.p15) / (b.p50 - b.p15)) * 35
  if (value <= b.p85) return 50 + ((value - b.p50) / (b.p85 - b.p50)) * 35
  if (value <= b.p97) return 85 + ((value - b.p85) / (b.p97 - b.p85)) * 12
  return Math.min(100, 97 + 3 * ((value - b.p97) / b.p97))
}

export function calcBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100
  return weightKg / (h * h)
}

// Returns [age, value] pairs for a reference curve — used by the SVG chart
export function getRefCurve(
  sex: string,
  type: 'weight' | 'height' | 'head',
  band: keyof PercentileBands,
): Array<{ age: number; value: number }> {
  const table = getTable(sex, type)
  return KEY_AGES.map((age, i) => ({ age, value: table[band][i] }))
}
