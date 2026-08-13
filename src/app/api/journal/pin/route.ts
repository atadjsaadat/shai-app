import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashPin, verifyPin } from '@/lib/pin/hash';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { data } = await supabase
    .from('profiles')
    .select('journal_lock_enabled')
    .eq('id', user.id)
    .single();

  return NextResponse.json({ enabled: data?.journal_lock_enabled ?? false });
}

// Set or change PIN — client verifies old PIN separately via /verify before calling this
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { pin } = await request.json();
  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ journal_pin_hash: hashPin(pin), journal_lock_enabled: true })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Remove PIN — body: { pin: string }
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { pin } = await request.json();

  const { data } = await supabase
    .from('profiles')
    .select('journal_pin_hash')
    .eq('id', user.id)
    .single();

  if (!data?.journal_pin_hash || !verifyPin(pin, data.journal_pin_hash)) {
    return NextResponse.json({ error: 'Incorrect PIN' }, { status: 403 });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ journal_pin_hash: null, journal_lock_enabled: false })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
