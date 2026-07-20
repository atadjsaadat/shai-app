import type { ParsedFoodItem, MealType } from './types'

export async function saveFoodLog(
  childId: string,
  items: ParsedFoodItem[],
  mealType: MealType,
  isHardFoodDay: boolean
): Promise<{ error: string | null }> {
  if (!childId) return { error: 'No child profile found — please complete setup first.' }
  const res = await fetch('/api/log/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId, items, mealType, isHardFoodDay }),
  })
  const json = await res.json()
  return { error: res.ok ? null : (json.error ?? 'Failed to save log.') }
}
