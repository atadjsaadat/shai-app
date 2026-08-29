import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lookupBarcode } from '@/lib/barcode/lookup'
import { saveChildScan } from '@/lib/barcode/childHistory'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { barcode, outcome }: { barcode: string; outcome: 'purchased' | 'rejected' | 'unknown' } = await req.json()
  if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 })

  const { data: child } = await supabase.from('children').select('id').eq('user_id', user.id).single()
  if (!child) return NextResponse.json({ error: 'No child profile' }, { status: 400 })

  const result = await lookupBarcode(barcode)
  if (!result) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  await saveChildScan(child.id, barcode, outcome, {
    item: result.item,
    brand: result.brand,
    novaClass: result.novaClass,
    additivesN: result.additivesN,
  })

  return NextResponse.json({ success: true, item: result.item, novaClass: result.novaClass, additivesN: result.additivesN, brand: result.brand })
}
