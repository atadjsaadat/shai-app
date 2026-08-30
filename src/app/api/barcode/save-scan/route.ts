import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { lookupBarcode } from '@/lib/barcode/lookup'
import { saveChildScan } from '@/lib/barcode/childHistory'
import type { ParsedFoodItem } from '@/lib/log/types'

const PANTRY_LIMIT: Record<string, number> = { free: 30, premium: 100, clinical: 100 }
const DEFAULT_LIMIT = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const {
    barcode,
    outcome,
    item: clientItem,
    brand: clientBrand,
    novaClass: clientNovaClass,
    additivesN: clientAdditivesN,
  }: {
    barcode: string
    outcome: 'purchased' | 'rejected' | 'unknown'
    item?: ParsedFoodItem
    brand?: string | null
    novaClass?: number | null
    additivesN?: number | null
  } = await req.json()

  if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 })

  const admin = createAdminClient()

  const [{ data: child }, { data: profile }] = await Promise.all([
    supabase.from('children').select('id').eq('user_id', user.id).single(),
    admin.from('profiles').select('tier').eq('id', user.id).single(),
  ])
  if (!child) return NextResponse.json({ error: 'No child profile' }, { status: 400 })

  const tier = (profile?.tier ?? 'free') as string
  const limit = PANTRY_LIMIT[tier] ?? DEFAULT_LIMIT

  // Only enforce limit for purchased items
  if (outcome === 'purchased') {
    const { data: existing } = await admin
      .from('child_scanned_products')
      .select('barcode')
      .eq('child_id', child.id)
      .eq('barcode', barcode)
      .maybeSingle()

    if (!existing) {
      const { count } = await admin
        .from('child_scanned_products')
        .select('barcode', { count: 'exact', head: true })
        .eq('child_id', child.id)
        .eq('scan_outcome', 'purchased')

      if ((count ?? 0) >= limit) {
        return NextResponse.json({ pantryFull: true, limit, tier })
      }
    }
  }

  // Use item data passed from client (already fetched during scan) — avoids second API call
  let itemData: { item: ParsedFoodItem; brand: string | null; novaClass: number | null; additivesN: number | null } | null = null

  if (clientItem) {
    itemData = {
      item: clientItem,
      brand: clientBrand ?? null,
      novaClass: clientNovaClass ?? null,
      additivesN: clientAdditivesN ?? null,
    }
  } else {
    // Fallback: re-fetch if client didn't pass item data
    const result = await lookupBarcode(barcode)
    if (!result) return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    itemData = result
  }

  try {
    await saveChildScan(child.id, barcode, outcome, itemData)
  } catch (err) {
    console.error('[save-scan] saveChildScan error:', err)
    return NextResponse.json({ error: 'Failed to save scan', detail: String(err) }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    item: itemData.item,
    novaClass: itemData.novaClass,
    additivesN: itemData.additivesN,
    brand: itemData.brand,
  })
}
