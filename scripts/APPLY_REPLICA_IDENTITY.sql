-- =====================================================
-- ВЫПОЛНИТЬ В SUPABASE DASHBOARD → SQL EDITOR
-- https://app.supabase.com/project/tvzzgivzkdswfrrjprlz/sql
-- =====================================================

-- 1. Включаем REPLICA IDENTITY FULL для таблицы реакций
-- Это заставит PostgreSQL включать ВСЕ столбцы в payload.old при DELETE
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- 2. Убеждаемся что публикация включает DELETE events
ALTER PUBLICATION supabase_realtime SET (publish = 'insert,update,delete');

-- 3. Проверяем что применено
SELECT 
  c.relname AS table_name,
  c.relreplident AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname = 'message_reactions' AND n.nspname = 'public';
-- replica_identity = 'f' означает FULL (правильно)
-- replica_identity = 'd' означает DEFAULT (неправильно, только id)
