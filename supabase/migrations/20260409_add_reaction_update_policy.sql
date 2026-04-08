-- FIX: Добавляем UPDATE policy для message_reactions
-- Upssert с onConflict требует UPDATE policy при обновлении существующей записи.
-- Без неё upsert на существующую запись падает с permission denied.
CREATE POLICY "message_reactions_update" ON public.message_reactions
  FOR UPDATE USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
    AND message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_members cm ON cm.chat_id = m.chat_id
      WHERE cm.user_id = auth.uid()
    )
  );
