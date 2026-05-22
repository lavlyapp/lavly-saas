-- Habilita as extensões necessárias para rodar crons e chamadas HTTP de dentro do Supabase
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove crons anteriores se existirem (para não duplicar em caso de re-execução)
SELECT cron.unschedule('vmpay-sync-day');
SELECT cron.unschedule('vmpay-sync-midnight');
SELECT cron.unschedule('vmpay-sync-night');

-- Agenda os crons para chamar a API do Vercel
-- HORÁRIOS EM UTC! (Para rodar 07:30 - 22:00 BRT, usamos 10:30 - 01:00 UTC)
-- O Supabase usa UTC para os crons.

-- 1. A cada 30 min entre 10:00 e 23:30 UTC (07:00 as 20:30 BRT)
SELECT cron.schedule(
  'vmpay-sync-day',
  '*/30 10-23 * * *',
  $$
    SELECT net.http_get(
        url := 'https://teste.lavly.com.br/api/vmpay/cron/sync',
        headers := '{"Authorization": "Bearer SEU_CRON_SECRET_AQUI"}'::jsonb
    );
  $$
);

-- 2. A cada 30 min entre 00:00 e 01:30 UTC (21:00 as 22:30 BRT)
SELECT cron.schedule(
  'vmpay-sync-midnight',
  '*/30 0-1 * * *',
  $$
    SELECT net.http_get(
        url := 'https://teste.lavly.com.br/api/vmpay/cron/sync',
        headers := '{"Authorization": "Bearer SEU_CRON_SECRET_AQUI"}'::jsonb
    );
  $$
);

-- 3. A cada 3 horas após as 01:00 UTC (04:00 e 07:00 UTC = 01:00 e 04:00 BRT)
SELECT cron.schedule(
  'vmpay-sync-night',
  '0 4,7 * * *',
  $$
    SELECT net.http_get(
        url := 'https://teste.lavly.com.br/api/vmpay/cron/sync',
        headers := '{"Authorization": "Bearer SEU_CRON_SECRET_AQUI"}'::jsonb
    );
  $$
);
