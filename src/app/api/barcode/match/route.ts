import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchFoodNames } from '@/lib/barcode/childHistory'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ matches: {} })

  const { foodNames }: { foodNames: string[] } = await req.json()
  if (!Array.isArray(foodNames) || foodNames.length === 0) return NextResponse.json({ matches: {} })

  const { data: child } = await supabase.from('children').select('id').eq('user_id', user.id).single()
  if (!child) return NextResponse.json({ matches: {} })

  const matchMap = await matchFoodNames(child.id, foodNames)

  const matches: Record<string, unknown> = {}
  for (const [name, match] of matchMap) { matches[name] = match }

  return NextResponse.json({ matches })
}
