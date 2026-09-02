import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const admin = createAdminClient()
  const barcode = req.nextUrl.searchParams.get('barcode')

  // Child allergies
  const { data: child } = await admin
    .from('children')
    .select('id, name, allergies, intolerances')
    .or(`user_id.eq.${user.id},linked_user_ids.cs.{${user.id}}`)
    .order('created_at', { ascending: true })
    .limit(1)
    .single()

  const out: Record<string, unknown> = {
    child_name: child?.name ?? null,
    child_allergies: child?.allergies ?? [],
    child_intolerances: child?.intolerances ?? [],
  }

  if (barcode) {
    // Raw barcode cache row
    const { data: cached } = await admin
      .from('barcode_cache')
      .select('barcode, product_name, allergens, calories_kcal')
      .eq('barcode', barcode)
      .single()
    out.cached_row = cached ?? 'not in cache'

    // Raw OFF response allergen fields only
    try {
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        headers: { 'User-Agent': 'SHAi-App/1.0 (shai.app)' },
        cache: 'no-store',
      })
      const offJson = await offRes.json()
      const p = offJson.product ?? {}
      out.off_allergens_tags = p.allergens_tags ?? 'field missing'
      out.off_allergens_from_ingredients_tags = p.allergens_from_ingredients_tags ?? 'field missing'
      out.off_traces_tags = p.traces_tags ?? 'field missing'
    } catch (e) {
      out.off_error = String(e)
    }
  }

  return NextResponse.json(out, { headers: { 'Cache-Control': 'no-store' } })
}
