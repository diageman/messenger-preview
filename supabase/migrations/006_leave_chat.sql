-- =====================================================
-- CHAT DELETION: ARCHIVE & DELETE FOR ALL
-- =====================================================
-- archive_chat      — hide chat for current user (reversible)
-- unarchive_chat    — restore archived chat on new message
-- delete_chat_for_all — permanently remove chat for everyone
-- =====================================================

-- 1. ARCHIVE: hide chat for current user only
CREATE OR REPLACE FUNCTION archive_chat(p_chat_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO archived_chats (chat_id, user_id)
  VALUES (p_chat_id, auth.uid())
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION archive_chat IS 'Hide chat for current user. Reversible via unarchive_chat.';

-- 2. UNARCHIVE: restore when new message arrives
CREATE OR REPLACE FUNCTION unarchive_chat(p_chat_id uuid)
RETURNS void AS $$
BEGIN
  DELETE FROM archived_chats
  WHERE chat_id = p_chat_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unarchive_chat IS 'Restore archived chat for current user.';

-- 3. DELETE FOR ALL: permanently remove chat
CREATE OR REPLACE FUNCTION delete_chat_for_all(p_chat_id uuid)
RETURNS void AS $$
DECLARE
  v_is_member boolean;
BEGIN
  -- Only chat members can delete
  SELECT EXISTS (
    SELECT 1 FROM chat_members
    WHERE chat_id = p_chat_id AND user_id = auth.uid()
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RAISE EXCEPTION 'Not a member of this chat';
  END IF;

  -- Delete entire chat (cascades to members, messages, reads, attachments, archives)
  DELETE FROM chats WHERE id = p_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_chat_for_all IS 'Permanently delete chat for all members. Only members can trigger.';