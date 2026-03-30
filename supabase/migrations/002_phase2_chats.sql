-- =====================================================
-- MESSENGER DATABASE SCHEMA - PHASE 2
-- =====================================================
-- Tables: chats, chat_members, messages, chat_reads, 
--         attachments, archived_chats
-- =====================================================

-- =====================================================
-- CHATS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('direct', 'group', 'channel')),
  name text,  -- nullable for direct chats
  description text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- For direct chat uniqueness
  direct_chat_key text
);

CREATE INDEX IF NOT EXISTS idx_chats_org ON chats(organization_id);
CREATE INDEX IF NOT EXISTS idx_chats_type ON chats(type);
CREATE INDEX IF NOT EXISTS idx_chats_created_by ON chats(created_by);

-- Unique constraint for direct chats
CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_direct_unique 
  ON chats(direct_chat_key) 
  WHERE type = 'direct' AND direct_chat_key IS NOT NULL;

-- =====================================================
-- CHAT MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text,  -- nullable for attachment-only messages
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'pinned', 'service')),
  metadata jsonb DEFAULT '{}',  -- for system/service messages
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  
  -- Ensure content exists for text messages
  CONSTRAINT text_message_has_content 
    CHECK (message_type != 'text' OR content IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- =====================================================
-- CHAT READS TABLE (simplified read model)
-- =====================================================

CREATE TABLE IF NOT EXISTS chat_reads (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_message_id uuid,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON chat_reads(user_id);

-- =====================================================
-- ATTACHMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);

-- =====================================================
-- ARCHIVED CHATS TABLE (user-scoped)
-- =====================================================

CREATE TABLE IF NOT EXISTS archived_chats (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  archived_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_archived_chats_user ON archived_chats(user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;

-- Update timestamp trigger for chats
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for messages
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create or get direct chat between two users
CREATE OR REPLACE FUNCTION create_direct_chat(
  p_org_id uuid,
  p_user1_id uuid,
  p_user2_id uuid
) RETURNS uuid AS $$
DECLARE
  v_chat_id uuid;
  v_sorted_users text;
BEGIN
  -- Sort user IDs to ensure consistent key
  v_sorted_users := (SELECT string_agg(uid, '_' ORDER BY uid) 
                     FROM (VALUES (p_user1_id::text), (p_user2_id::text)) AS t(uid));
  
  -- Check if chat already exists
  SELECT id INTO v_chat_id 
  FROM chats 
  WHERE type = 'direct' 
    AND direct_chat_key = v_sorted_users
    AND organization_id = p_org_id;
  
  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;  -- Return existing chat
  END IF;
  
  -- Create new chat
  INSERT INTO chats (organization_id, type, created_by, direct_chat_key)
  VALUES (p_org_id, 'direct', p_user1_id, v_sorted_users)
  RETURNING id INTO v_chat_id;
  
  -- Add participants
  INSERT INTO chat_members (chat_id, user_id, role)
  VALUES (v_chat_id, p_user1_id, 'member'),
         (v_chat_id, p_user2_id, 'member');
  
  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_chats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS chat_members_visible ON chats;
DROP POLICY IF EXISTS chat_members_visible ON chat_members;
DROP POLICY IF EXISTS messages_visible ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DROP POLICY IF EXISTS chat_reads_own ON chat_reads;
DROP POLICY IF EXISTS attachments_visible ON attachments;
DROP POLICY IF EXISTS archived_chats_own ON archived_chats;

-- Chats: users can only see chats they're members of
CREATE POLICY chat_members_visible ON chats FOR SELECT
  USING (
    id IN (
      SELECT chat_id FROM chat_members
      WHERE user_id = auth.uid()
    )
  );

-- Chat Members: users can see members of their chats
CREATE POLICY chat_members_visible ON chat_members FOR SELECT
  USING (
    chat_id IN (
      SELECT id FROM chats 
      WHERE id IN (
        SELECT chat_id FROM chat_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Messages: users can only see messages in chats they're in
CREATE POLICY messages_visible ON messages FOR SELECT
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.uid()
    )
  );

-- Messages: users can insert messages to their chats
CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (
    chat_id IN (
      SELECT chat_id FROM chat_members 
      WHERE user_id = auth.uid()
    )
  );

-- Messages: users can update their own messages
CREATE POLICY messages_update ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Chat Members: users can insert members (used by create_direct_chat function)
CREATE POLICY chat_members_insert ON chat_members FOR INSERT
  WITH CHECK (true);

-- Chat Reads: users can only see/edit their own read status
CREATE POLICY chat_reads_own ON chat_reads FOR ALL
  USING (user_id = auth.uid());

-- Attachments: same access as messages
CREATE POLICY attachments_visible ON attachments FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM messages 
      WHERE chat_id IN (
        SELECT chat_id FROM chat_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Archived Chats: users can only see/edit their own archived chats
CREATE POLICY archived_chats_own ON archived_chats FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================

-- Create sample chats for the demo user
-- Note: This requires at least one user in profiles table

DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get first user from organization
  SELECT id INTO v_user_id FROM profiles WHERE organization_id = v_org_id LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Create a test group chat
    INSERT INTO chats (organization_id, type, name, description, created_by)
    VALUES (v_org_id, 'group', 'Общий чат отдела', 'Чат для всех сотрудников', v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE chats IS 'Chat rooms (direct/group/channel)';
COMMENT ON TABLE chat_members IS 'Chat membership mapping';
COMMENT ON TABLE messages IS 'Chat messages';
COMMENT ON TABLE chat_reads IS 'User read receipts per chat';
COMMENT ON TABLE attachments IS 'Message file attachments';
COMMENT ON TABLE archived_chats IS 'User-scoped chat archive';
COMMENT ON FUNCTION create_direct_chat IS 'Create or get existing direct chat between two users';
