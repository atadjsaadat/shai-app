import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

// POST — upsert active alarm for a child
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { childId, dueAt, intervalMins } = await req.json();
  if (!childId || !dueAt || !intervalMins) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin.from('feed_alarms').upsert(
    { child_id: childId, user_id: user.id, due_at: dueAt, interval_mins: intervalMins, is_active: true, updated_at: new Date().toISOString() },
    { onConflict: 'child_id' }
  );

  return NextResponse.json({ ok: true });
}

// DELETE — deactivate alarm when reminder is turned off
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { childId } = await req.json();
  const admin = createAdminClient();
  await admin.from('feed_alarms').update({ is_active: false }).eq('child_id', childId).eq('user_id', user.id);

  return NextResponse.json({ ok: true });
}
