import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 5 * 60_000); // next 5 minutes

  // Find alarms due in the next 5-minute window
  const { data: alarms } = await admin
    .from('feed_alarms')
    .select('id, child_id, user_id, due_at, interval_mins')
    .eq('is_active', true)
    .gte('due_at', now.toISOString())
    .lte('due_at', windowEnd.toISOString());

  if (!alarms?.length) return NextResponse.json({ sent: 0 });

  let sent = 0;

  for (const alarm of alarms) {
    // Get all push subscriptions for this user
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth_key')
      .eq('user_id', alarm.user_id);

    // Get child name for the notification body
    const { data: child } = await admin
      .from('children')
      .select('name')
      .eq('id', alarm.child_id)
      .single();

    const payload = JSON.stringify({
      title: 'Feed reminder',
      body: `Time for ${child?.name ?? 'your little one'}'s next feed`,
      icon: '/icons/icon-192.png',
    });

    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        );
        sent++;
      } catch {
        // Subscription expired — remove it
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }

    // Advance alarm to next interval
    const nextDueAt = new Date(new Date(alarm.due_at).getTime() + alarm.interval_mins * 60_000);
    await admin.from('feed_alarms').update({ due_at: nextDueAt.toISOString(), updated_at: now.toISOString() }).eq('id', alarm.id);
  }

  return NextResponse.json({ sent });
}
