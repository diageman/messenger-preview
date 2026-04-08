-- ============================================================
-- Migration: message_reads — read receipts для галочек ✓✓
-- ============================================================

-- 1. Таблица прочтений отдельных сообщений
CREATE TABLE IF NOT EXISTS public.message_reads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reads_message_id ON public.message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reads_user_id    ON public.message_reads(user_id);

-- 2. Row Level Security
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;

-- Пользователь видит прочтения своих исходящих сообщений и свои собственные прочтения
CREATE POLICY "message_reads_select" ON public.message_reads
  FOR SELECT USING (
    user_id = auth.uid()
    OR message_id IN (
      SELECT id FROM public.messages WHERE sender_id = auth.uid()
    )
  );

-- Пользователь может вставлять только свои прочтения
CREATE POLICY "message_reads_insert" ON public.message_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Пользователь может удалять только свои прочтения
CREATE POLICY "message_reads_delete" ON public.message_reads
  FOR DELETE USING (user_id = auth.uid());

-- 3. Функция массовой пометки сообщений чата как прочитанных
CREATE OR REPLACE FUNCTION public.mark_messages_read(
  p_chat_id   uuid,
  p_user_id   uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Вставляем read-записи для всех непрочитанных сообщений в чате
  -- (кроме собственных сообщений пользователя)
  INSERT INTO public.message_reads (message_id, user_id, read_at)
  SELECT m.id, p_user_id, now()
  FROM   public.messages m
  WHERE  m.chat_id    = p_chat_id
    AND  m.sender_id != p_user_id
    AND  m.deleted_at IS NULL
    AND  NOT EXISTS (
      SELECT 1 FROM public.message_reads r
      WHERE r.message_id = m.id
        AND r.user_id    = p_user_id
    )
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;

-- 4. Включаем Realtime для таблицы
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reads;
