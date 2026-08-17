import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { lookupBarcode } from '@/lib/barcode/lookup'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const barcode = req.nextUrl.searchParams.get('barcode')
  if (!barcode) return NextResponse.json({ error: 'barcode required' }, { status: 400 })

  const result = await lookupBarcode(barcode)
  if (!result) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  return NextResponse.json({ item: result.item, novaClass: result.novaClass, additivesN: result.additivesN })
}
