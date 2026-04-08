-- Добавляем поддержку ответов на сообщения
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Индекс для быстрого поиска ответов
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON public.messages(reply_to_message_id)
  WHERE reply_to_message_id IS NOT NULL;
