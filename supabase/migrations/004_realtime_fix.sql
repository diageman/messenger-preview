-- 1. ВКЛЮЧАЕМ REALTIME ДЛЯ ТАБЛИЦ
-- Без этого сообщения не будут приходить мгновенно
begin;
  -- Добавляем таблицы в Realtime (без IF EXISTS, так как Postgres его тут не поддерживает)
  -- Если вылетает ошибка 'already member', просто пропустите эти строки
  alter publication supabase_realtime add table messages;
  alter publication supabase_realtime add table chats;
  alter publication supabase_realtime add table chat_members;
commit;

-- 2. ОПТИМИЗИРУЕМ ПОЛИТИКИ (SELECT FIX)
-- Используем EXISTS вместо IN для стабильности в продакшене
DROP POLICY IF EXISTS messages_visible ON messages;
CREATE POLICY messages_visible ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = messages.chat_id 
      AND chat_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_members_visible ON chats;
CREATE POLICY chat_members_visible ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_members 
      WHERE chat_members.chat_id = chats.id 
      AND chat_members.user_id = auth.uid()
    )
  );