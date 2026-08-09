SELECT extname
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net', 'supabase_vault')
ORDER BY extname;
