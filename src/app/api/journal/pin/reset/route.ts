import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { password } = await request.json();
  if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 });

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authError) return NextResponse.json({ error: 'Incorrect password' }, { status: 403 });

  const { error } = await supabase
    .from('profiles')
    .update({ journal_pin_hash: null, journal_lock_enabled: false })
    .eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
