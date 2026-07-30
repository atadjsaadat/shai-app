import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calcPercentile, calcBMI } from '@/lib/growth/calculations'

function ageInMonths(dob: string, at: string): number {
  const birth = new Date(dob)
  const measured = new Date(at)
  return (measured.getFullYear() - birth.getFullYear()) * 12
    + (measured.getMonth() - birth.getMonth())
    + (measured.getDate() < birth.getDate() ? -1 : 0)
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const childId = req.nextUrl.searchParams.get('childId')
  if (!childId) return NextResponse.json({ error: 'childId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: child } = await admin
    .from('children')
    .select('id, date_of_birth, sex')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const { data: records, error } = await admin
    .from('growth_records')
    .select('id, recorded_at, weight_kg, height_cm, who_weight_percentile, who_height_percentile, who_bmi_percentile, notes')
    .eq('child_id', childId)
    .order('recorded_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ records: records ?? [], sex: child.sex, dob: child.date_of_birth })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { childId, recordedAt, weightKg, heightCm, notes } = await req.json()
  if (!childId || !recordedAt) return NextResponse.json({ error: 'childId and recordedAt required' }, { status: 400 })
  if (!weightKg && !heightCm) return NextResponse.json({ error: 'At least one of weightKg or heightCm required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: child } = await admin
    .from('children')
    .select('id, date_of_birth, sex')
    .eq('id', childId)
    .eq('user_id', user.id)
    .single()

  if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 })

  const sex = child.sex ?? 'male'
  const months = child.date_of_birth ? ageInMonths(child.date_of_birth, recordedAt) : 0

  const whoWeightPercentile = weightKg ? calcPercentile(weightKg, sex, months, 'weight') : null
  const whoHeightPercentile = heightCm ? calcPercentile(heightCm, sex, months, 'height') : null
  const bmi = weightKg && heightCm ? calcBMI(weightKg, heightCm) : null
  const whoBmiPercentile = bmi ? calcPercentile(bmi, sex, months, 'weight') : null

  const now = new Date()
  const month = now.getMonth()
  const season =
    month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'autumn'

  const { data, error } = await admin
    .from('growth_records')
    .insert({
      child_id: childId,
      recorded_by: user.id,
      recorded_at: recordedAt,
      weight_kg: weightKg ?? null,
      height_cm: heightCm ?? null,
      who_weight_percentile: whoWeightPercentile,
      who_height_percentile: whoHeightPercentile,
      who_bmi_percentile: whoBmiPercentile,
      notes: notes ?? null,
      season,
    })
    .select('id, recorded_at, weight_kg, height_cm, who_weight_percentile, who_height_percentile, who_bmi_percentile')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ record: data })
}
