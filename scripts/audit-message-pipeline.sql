-- =====================================================
-- MESSAGE PIPELINE AUDIT - SUPABASE CONFIGURATION
-- =====================================================

-- 1. Check realtime publication
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 2. Check which tables are in publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- 3. Check RLS policies for messages
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('messages', 'chat_reads', 'chat_members', 'chats')
ORDER BY tablename, policyname;

-- 4. Check messages table structure
\d messages

-- 5. Check chat_reads table structure
\d chat_reads

-- 6. Check if create_direct_chat function exists
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'create_direct_chat';

-- 7. Check current messages count
SELECT COUNT(*) FROM messages;

-- 8. Check recent messages
SELECT 
  m.id,
  m.chat_id,
  m.sender_id,
  m.content,
  m.created_at,
  p.full_name as sender_name
FROM messages m
LEFT JOIN profiles p ON m.sender_id = p.id
ORDER BY m.created_at DESC
LIMIT 10;

-- 9. Check chat_reads state
SELECT 
  cr.chat_id,
  cr.user_id,
  cr.last_read_message_id,
  cr.last_read_at,
  p.full_name as user_name
FROM chat_reads cr
LEFT JOIN profiles p ON cr.user_id = p.id
ORDER BY cr.last_read_at DESC;

-- 10. Check for any orphaned messages (no chat_members match)
SELECT COUNT(*) as orphaned_messages
FROM messages m
WHERE NOT EXISTS (
  SELECT 1 FROM chat_members cm 
  WHERE cm.chat_id = m.chat_id 
  AND cm.user_id = m.sender_id
);
