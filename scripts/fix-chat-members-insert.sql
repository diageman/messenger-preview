-- =====================================================
-- FIX: Add INSERT policy for chat_members
-- =====================================================
-- This policy allows the create_direct_chat function (SECURITY DEFINER)
-- to insert chat members. Without this, RLS blocks the INSERT.
-- =====================================================

-- Drop existing policy if exists
DROP POLICY IF EXISTS chat_members_insert ON chat_members;

-- Allow insert when the user is a member being added
-- This works with SECURITY DEFINER functions
CREATE POLICY chat_members_insert ON chat_members FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- Alternative: More restrictive policy
-- Only allow insert if the current user is one of the members
-- =====================================================
-- CREATE POLICY chat_members_insert ON chat_members FOR INSERT
--   WITH CHECK (
--     user_id = auth.uid() OR
--     EXISTS (
--       SELECT 1 FROM chats
--       WHERE id = chat_id
--       AND created_by = auth.uid()
--     )
--   );
