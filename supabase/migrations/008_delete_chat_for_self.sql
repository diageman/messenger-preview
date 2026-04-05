-- Migration 008: delete_chat_for_self
CREATE OR REPLACE FUNCTION delete_chat_for_self(p_chat_id uuid)
RETURNS void AS $$
DECLARE
  v_chat_type text;
BEGIN
  SELECT type INTO v_chat_type FROM chats WHERE id = p_chat_id;
  IF v_chat_type IS NULL THEN
    RAISE EXCEPTION 'Chat not found';
  END IF;
  INSERT INTO hidden_messages (message_id, user_id)
  SELECT id, auth.uid() FROM messages WHERE chat_id = p_chat_id
  ON CONFLICT DO NOTHING;
  DELETE FROM chat_members WHERE chat_id = p_chat_id AND user_id = auth.uid();
  DELETE FROM chat_reads WHERE chat_id = p_chat_id AND user_id = auth.uid();
  DELETE FROM archived_chats WHERE chat_id = p_chat_id AND user_id = auth.uid();
  IF v_chat_type = 'direct' THEN
    DELETE FROM chats WHERE id = p_chat_id
      AND NOT EXISTS (SELECT 1 FROM chat_members WHERE chat_id = p_chat_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION delete_chat_for_self IS 'Remove user from chat. For direct chats, deletes when both leave.';
DO $$ BEGIN
  ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
  ALTER TABLE public.messages ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;