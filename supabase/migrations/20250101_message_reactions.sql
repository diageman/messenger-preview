-- Таблица реакций на сообщения
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Индекс для быстрого поиска реакций по сообщению
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id
  ON public.message_reactions(message_id);

-- RLS: пользователи видят реакции только в чатах, где они участники
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_reactions_select" ON public.message_reactions
  FOR SELECT USING (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_members cm ON cm.chat_id = m.chat_id
      WHERE cm.user_id = auth.uid()
    )
  );

CREATE POLICY "message_reactions_insert" ON public.message_reactions
  FOR INSERT WITH CHECK (
    message_id IN (
      SELECT m.id FROM public.messages m
      JOIN public.chat_members cm ON cm.chat_id = m.chat_id
      WHERE cm.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "message_reactions_delete" ON public.message_reactions
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Realtime для таблицы реакций
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;