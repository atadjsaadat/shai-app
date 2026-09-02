import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { lookupBarcode } from '@/lib/barcode/lookup'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const barcode = req.nextUrl.searchParams.get('barcode')
  if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 })

  const admin = createAdminClient()

  const [result, childRes] = await Promise.all([
    lookupBarcode(barcode),
    supabase.from('children').select('id')
      .or(`user_id.eq.${user.id},linked_user_ids.cs.{${user.id}}`)
      .limit(1)
      .maybeSingle(),
  ])

  if (!result) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  let inPantry = false
  if (childRes.data) {
    const { data: existing } = await admin
      .from('child_scanned_products')
      .select('barcode')
      .eq('child_id', childRes.data.id)
      .eq('barcode', barcode)
      .eq('scan_outcome', 'purchased')
      .maybeSingle()
    inPantry = existing != null
  }

  return NextResponse.json({ item: result.item, novaClass: result.novaClass, additivesN: result.additivesN, brand: result.brand, allergens: result.allergens, inPantry })
}
