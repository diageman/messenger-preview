-- =====================================================
-- FIX PROFILES FOR demo1@mail.ru AND d1ageman@yandex.ru
-- =====================================================
-- Real user IDs:
-- demo1@mail.ru: 9ff3d4ef-fca8-4882-8da9-e5a390509330
-- d1ageman@yandex.ru: d0ced572-9909-428f-8d70-6266bf3e0d1f
-- =====================================================

-- 1. Create profiles
INSERT INTO profiles (id, organization_id, full_name, role, email, status)
VALUES 
  (
    '9ff3d4ef-fca8-4882-8da9-e5a390509330',
    '00000000-0000-0000-0000-000000000001',
    'Demo User One',
    'Сотрудник',
    'demo1@mail.ru',
    'online'
  ),
  (
    'd0ced572-9909-428f-8d70-6266bf3e0d1f',
    '00000000-0000-0000-0000-000000000001',
    'Dmitry Cherevko',
    'Руководитель группы 1',
    'd1ageman@yandex.ru',
    'online'
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  status = EXCLUDED.status;

-- 2. Verify profiles created
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id,
  o.name as org_name
FROM profiles p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.email IN ('demo1@mail.ru', 'd1ageman@yandex.ru');

-- 3. Check for existing direct chats between this pair
SELECT 
  c.id as chat_id,
  c.type,
  c.direct_chat_key,
  c.created_by,
  COUNT(cm.user_id) as member_count,
  STRING_AGG(p.email, ', ') as members
FROM chats c
LEFT JOIN chat_members cm ON c.id = cm.chat_id
LEFT JOIN profiles p ON cm.user_id = p.id
WHERE c.type = 'direct'
  AND (
    c.direct_chat_key = '9ff3d4ef-fca8-4882-8da9-e5a390509330_d0ced572-9909-428f-8d70-6266bf3e0d1f'
    OR c.direct_chat_key = 'd0ced572-9909-428f-8d70-6266bf3e0d1f_9ff3d4ef-fca8-4882-8da9-e5a390509330'
  )
GROUP BY c.id, c.type, c.direct_chat_key, c.created_by;

-- 4. If no chat exists, this query will show what's needed
-- After running this, users can create chat via UI
