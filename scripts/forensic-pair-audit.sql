-- =====================================================
-- PAIR-SPECIFIC BUG FORENSIC AUDIT
-- =====================================================
-- Users: demo1@mail.ru, d1ageman@yandex.ru
-- =====================================================

-- 1. Find exact user IDs
SELECT 
  'auth.users' as source,
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name,
  created_at
FROM auth.users
WHERE email IN ('demo1@mail.ru', 'd1ageman@yandex.ru')
UNION ALL
SELECT 
  'profiles' as source,
  id,
  email,
  full_name,
  created_at
FROM profiles
WHERE email IN ('demo1@mail.ru', 'd1ageman@yandex.ru')
ORDER BY source, email;

-- 2. Check profile completeness
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id,
  p.status,
  o.name as org_name,
  o.slug as org_slug
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email IN ('demo1@mail.ru', 'd1ageman@yandex.ru');

-- 3. Find all direct chats for this pair
SELECT 
  c.id as chat_id,
  c.type,
  c.organization_id,
  c.direct_chat_key,
  c.created_by,
  c.created_at,
  c.updated_at,
  COUNT(DISTINCT cm.user_id) as member_count,
  COUNT(DISTINCT m.id) as message_count
FROM chats c
LEFT JOIN chat_members cm ON c.id = cm.chat_id
LEFT JOIN messages m ON c.id = m.chat_id
WHERE c.type = 'direct'
  AND c.direct_chat_key LIKE '%demo1@mail.ru%'
     OR c.direct_chat_key LIKE '%d1ageman@yandex.ru%'
     OR EXISTS (
       SELECT 1 FROM chat_members cm2
       JOIN profiles p2 ON cm2.user_id = p2.id
       WHERE cm2.chat_id = c.id
       AND p2.email IN ('demo1@mail.ru', 'd1ageman@yandex.ru')
     )
GROUP BY c.id, c.type, c.organization_id, c.direct_chat_key, c.created_by, c.created_at, c.updated_at
ORDER BY c.created_at DESC;

-- 4. Check chat_members for this pair
SELECT 
  cm.chat_id,
  cm.user_id,
  cm.role,
  cm.joined_at,
  p.email,
  p.full_name,
  p.organization_id
FROM chat_members cm
JOIN profiles p ON cm.user_id = p.id
WHERE p.email IN ('demo1@mail.ru', 'd1ageman@yandex.ru')
ORDER BY cm.chat_id, cm.joined_at;

-- 5. Check for duplicate direct chats
SELECT 
  direct_chat_key,
  COUNT(*) as chat_count,
  STRING_AGG(id::text, ', ') as chat_ids
FROM chats
WHERE type = 'direct'
GROUP BY direct_chat_key
HAVING COUNT(*) > 1;

-- 6. Check messages between this pair
SELECT 
  m.id,
  m.chat_id,
  m.sender_id,
  m.content,
  m.message_type,
  m.created_at,
  p.email as sender_email,
  p.full_name as sender_name
FROM messages m
JOIN profiles p ON m.sender_id = p.id
WHERE m.chat_id IN (
  SELECT c.id FROM chats c
  WHERE c.type = 'direct'
  AND (
    c.direct_chat_key LIKE '%demo1@mail.ru%'
    OR c.direct_chat_key LIKE '%d1ageman@yandex.ru%'
  )
)
ORDER BY m.created_at DESC
LIMIT 20;

-- 7. Check chat_reads for this pair
SELECT 
  cr.chat_id,
  cr.user_id,
  cr.last_read_message_id,
  cr.last_read_at,
  p.email,
  p.full_name
FROM chat_reads cr
JOIN profiles p ON cr.user_id = p.id
WHERE p.email IN ('demo1@mail.ru', 'd1ageman@yandex.ru')
ORDER BY cr.chat_id, cr.last_read_at DESC;

-- 8. Check RLS policies visibility
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
WHERE tablename IN ('chats', 'chat_members', 'messages', 'chat_reads')
  AND (
    qual LIKE '%auth.uid()%'
    OR with_check LIKE '%auth.uid()%'
  )
ORDER BY tablename, policyname;

-- 9. Find working pair for comparison (any pair with messages)
SELECT 
  c.id as chat_id,
  c.direct_chat_key,
  COUNT(DISTINCT cm.user_id) as members,
  COUNT(DISTINCT m.id) as messages,
  STRING_AGG(p.email, ', ') as user_emails
FROM chats c
JOIN chat_members cm ON c.id = cm.chat_id
JOIN profiles p ON cm.user_id = p.id
LEFT JOIN messages m ON c.id = m.chat_id
WHERE c.type = 'direct'
  AND c.direct_chat_key IS NOT NULL
GROUP BY c.id, c.direct_chat_key
HAVING COUNT(DISTINCT m.id) > 0
ORDER BY messages DESC
LIMIT 5;

-- 10. Check organization consistency
SELECT 
  p.email,
  p.organization_id,
  o.name as org_name,
  o.slug,
  COUNT(DISTINCT c.id) as chats,
  COUNT(DISTINCT m.id) as messages
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
LEFT JOIN chats c ON p.organization_id = c.organization_id
LEFT JOIN chat_members cm ON p.id = cm.user_id
LEFT JOIN messages m ON cm.chat_id = m.chat_id AND m.sender_id = p.id
WHERE p.email IN ('demo1@mail.ru', 'd1ageman@yandex.ru')
GROUP BY p.email, p.organization_id, o.name, o.slug;
