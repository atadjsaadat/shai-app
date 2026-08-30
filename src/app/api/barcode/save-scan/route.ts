import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { lookupBarcode } from '@/lib/barcode/lookup'
import { saveChildScan } from '@/lib/barcode/childHistory'

const PANTRY_LIMIT: Record<string, number> = { free: 30, premium: 100, clinical: 100 }
const DEFAULT_LIMIT = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { barcode, outcome }: { barcode: string; outcome: 'purchased' | 'rejected' | 'unknown' } = await req.json()
  if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 })

  const admin = createAdminClient()

  const [{ data: child }, { data: profile }] = await Promise.all([
    supabase.from('children').select('id').eq('user_id', user.id).single(),
    admin.from('profiles').select('tier').eq('id', user.id).single(),
  ])
  if (!child) return NextResponse.json({ error: 'No child profile' }, { status: 400 })

  const tier = (profile?.tier ?? 'free') as string
  const limit = PANTRY_LIMIT[tier] ?? DEFAULT_LIMIT

  // Only enforce limit for purchased items — rejected/unknown don't count toward pantry
  if (outcome === 'purchased') {
    const { data: existing } = await admin
      .from('child_scanned_products')
      .select('barcode')
      .eq('child_id', child.id)
      .eq('barcode', barcode)
      .maybeSingle()

    // Only count if this is a new product (upsert on existing barcode doesn't increase count)
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

  const result = await lookupBarcode(barcode)
  if (!result) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  try {
    await saveChildScan(child.id, barcode, outcome, {
      item: result.item,
      brand: result.brand,
      novaClass: result.novaClass,
      additivesN: result.additivesN,
    })
  } catch (err) {
    console.error('[save-scan] saveChildScan error:', err)
    return NextResponse.json({ error: 'Failed to save scan', detail: String(err) }, { status: 500 })
  }

  return NextResponse.json({ success: true, item: result.item, novaClass: result.novaClass, additivesN: result.additivesN, brand: result.brand })
}
