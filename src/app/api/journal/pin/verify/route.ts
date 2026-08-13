import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPin } from '@/lib/pin/hash';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { pin } = await request.json();

  const { data } = await supabase
    .from('profiles')
    .select('journal_pin_hash, journal_lock_enabled')
    .eq('id', user.id)
    .single();

  if (!data?.journal_lock_enabled || !data.journal_pin_hash) {
    return NextResponse.json({ valid: true });
  }

  return NextResponse.json({ valid: verifyPin(pin, data.journal_pin_hash) });
}
