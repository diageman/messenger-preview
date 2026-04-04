-- =====================================================
-- LEAVE/DELETE CHAT FUNCTIONALITY
-- =====================================================
-- Allows users to remove themselves from a chat.
-- For direct chats with no remaining members, cleans up orphan.
-- =====================================================

CREATE OR REPLACE FUNCTION leave_chat(p_chat_id uuid)
RETURNS void AS $$
DECLARE
  v_chat_type text;
BEGIN
  -- Get chat type before removing membership
  SELECT type INTO v_chat_type
  FROM chats
  WHERE id = p_chat_id;

  -- Remove current user from chat_members
  DELETE FROM chat_members
  WHERE chat_id = p_chat_id AND user_id = auth.uid();

  -- For direct chats: if no members left, clean up orphaned chat
  IF v_chat_type = 'direct' AND NOT EXISTS (
    SELECT 1 FROM chat_members WHERE chat_id = p_chat_id
  ) THEN
    DELETE FROM chats WHERE id = p_chat_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION leave_chat IS 'Remove current user from a chat. Cleans up orphaned direct chats.';