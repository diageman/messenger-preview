-- FIX: Включаем REPLICA IDENTITY FULL для таблицы реакций
-- Это необходимо, чтобы Supabase Realtime при DELETE событиях
-- отправлял полные данные старой записи (old.*), а не только primary key.
-- Без этого payload.old в SSE содержит только {id: "..."} и мы не можем
-- определить message_id, user_id, emoji для обновления UI.
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Убеждаемся что публикация supabase_realtime включает DELETE events
-- (по умолчанию может быть только insert,update)
ALTER PUBLICATION supabase_realtime 
  SET (publish = 'insert,update,delete');
