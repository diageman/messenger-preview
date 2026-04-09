-- =====================================================
-- FIX: Пересоздание публикации для message_reactions
-- Выполнить в Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Убираем таблицу из публикации
ALTER PUBLICATION supabase_realtime DROP TABLE public.message_reactions;

-- 2. Добавляем обратно (теперь с FULL replica identity)
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- 3. Убеждаемся что публикация включает все события
ALTER PUBLICATION supabase_realtime SET (publish = 'insert,update,delete');

-- 4. Проверяем
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions';

-- 5. Проверяем replica identity (должно быть f = FULL)
SELECT 
  relname,
  CASE relreplident
    WHEN 'd' THEN 'DEFAULT (only id)'
    WHEN 'f' THEN 'FULL (all columns)'
    WHEN 'n' THEN 'NOTHING'
    WHEN 'i' THEN 'INDEX'
  END AS replica_identity
FROM pg_class
WHERE relname = 'message_reactions';
