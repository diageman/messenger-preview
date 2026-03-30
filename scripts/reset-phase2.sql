-- =====================================================
-- ПОЛНОЕ ПЕРЕСОЗДАНИЕ PHASE 2
-- =====================================================
-- Копируй и выполни в SQL Editor
-- =====================================================

-- 1. Безопасное удаление политик (только если таблицы существуют)
DO $$ BEGIN
  DROP POLICY IF EXISTS chat_members_visible ON chats;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS chat_members_visible ON chat_members;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS messages_visible ON messages;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS messages_insert ON messages;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS messages_update ON messages;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS chat_reads_own ON chat_reads;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS attachments_visible ON attachments;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS archived_chats_own ON archived_chats;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 2. Безопасное удаление триггеров
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 3. Удаляем таблицы (CASCADE удалит зависимые объекты)
DROP TABLE IF EXISTS attachments CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chat_reads CASCADE;
DROP TABLE IF EXISTS archived_chats CASCADE;
DROP TABLE IF EXISTS chats CASCADE;

-- 4. Удаляем функцию
DROP FUNCTION IF EXISTS create_direct_chat CASCADE;

-- =====================================================
-- 5. СОЗДАНИЕ ТАБЛИЦ
-- =====================================================

-- CHATS TABLE
CREATE TABLE chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('direct', 'group', 'channel')),
  name text,
  description text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  direct_chat_key text
);

CREATE INDEX idx_chats_org ON chats(organization_id);
CREATE INDEX idx_chats_type ON chats(type);
CREATE INDEX idx_chats_created_by ON chats(created_by);

CREATE UNIQUE INDEX idx_chats_direct_unique
  ON chats(direct_chat_key)
  WHERE type = 'direct' AND direct_chat_key IS NOT NULL;

-- CHAT MEMBERS TABLE
CREATE TABLE chat_members (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_members_user ON chat_members(user_id);
CREATE INDEX idx_chat_members_chat ON chat_members(chat_id);

-- MESSAGES TABLE
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'pinned', 'service')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT text_message_has_content
    CHECK (message_type != 'text' OR content IS NOT NULL)
);

CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- CHAT READS TABLE
CREATE TABLE chat_reads (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_message_id uuid,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_chat_reads_user ON chat_reads(user_id);

-- ATTACHMENTS TABLE
CREATE TABLE attachments (
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

CREATE INDEX idx_attachments_message ON attachments(message_id);

-- ARCHIVED CHATS TABLE
CREATE TABLE archived_chats (
  chat_id uuid NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE INDEX idx_archived_chats_user ON archived_chats(user_id);

-- =====================================================
-- 6. ТРИГГЕРЫ
-- =====================================================

CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. ФУНКЦИЯ CREATE_DIRECT_CHAT
-- =====================================================

CREATE OR REPLACE FUNCTION create_direct_chat(
  p_org_id uuid,
  p_user1_id uuid,
  p_user2_id uuid
) RETURNS uuid AS $$
DECLARE
  v_chat_id uuid;
  v_sorted_users text;
BEGIN
  v_sorted_users := (SELECT string_agg(uid, '_' ORDER BY uid)
                     FROM (VALUES (p_user1_id::text), (p_user2_id::text)) AS t(uid));

  SELECT id INTO v_chat_id
  FROM chats
  WHERE type = 'direct'
    AND direct_chat_key = v_sorted_users
    AND organization_id = p_org_id;

  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  INSERT INTO chats (organization_id, type, created_by, direct_chat_key)
  VALUES (p_org_id, 'direct', p_user1_id, v_sorted_users)
  RETURNING id INTO v_chat_id;

  INSERT INTO chat_members (chat_id, user_id, role)
  VALUES (v_chat_id, p_user1_id, 'member'),
         (v_chat_id, p_user2_id, 'member');

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_chats ENABLE ROW LEVEL SECURITY;

-- Chats: users can only see chats they're member of
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
-- ГОТОВО
-- =====================================================
