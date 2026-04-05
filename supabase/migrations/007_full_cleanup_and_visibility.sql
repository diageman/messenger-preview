-- Настройка каскадного удаления для полной очистки базы

-- 1. Сообщения: удаляются вместе с профилем автора
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Чаты: удаляются вместе с создателем
ALTER TABLE public.chats DROP CONSTRAINT IF EXISTS chats_created_by_fkey;
ALTER TABLE public.chats ADD CONSTRAINT chats_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Таблица для функции "Удалить для меня"
CREATE TABLE IF NOT EXISTS public.hidden_messages (
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

-- Индекс для производительности
CREATE INDEX IF NOT EXISTS idx_hidden_messages_user ON public.hidden_messages(user_id);

-- Включаем RLS
ALTER TABLE public.hidden_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own hidden messages" 
ON public.hidden_messages FOR ALL 
USING (auth.uid() = user_id);