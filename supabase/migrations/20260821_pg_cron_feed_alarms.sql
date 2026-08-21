-- Enable pg_net for outbound HTTP requests from the database
create extension if not exists pg_net with schema extensions;

-- Schedule feed alarm check every 5 minutes via pg_cron
-- Calls the Vercel route which queries feed_alarms and sends Web Push
select cron.schedule(
  'feed-alarm-check',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://shay-app.vercel.app/api/cron/feed-alarms'
  )
  $$
);
