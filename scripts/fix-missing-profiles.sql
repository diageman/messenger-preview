-- =====================================================
-- FIX: CREATE PROFILES FOR EXISTING USERS
-- =====================================================
-- Выполнить в Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. Найти всех пользователей без профилей
SELECT 
  u.id,
  u.email,
  u.created_at,
  'NO PROFILE' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 2. Создать профили для пользователей без профилей
INSERT INTO profiles (id, organization_id, full_name, role, email, status)
SELECT 
  u.id,
  '00000000-0000-0000-0000-000000000001'::uuid as organization_id,
  COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1)) as full_name,
  'Сотрудник' as role,
  u.email,
  'online' as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name;

-- 3. Проверить что профили созданы
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.organization_id
FROM profiles p
ORDER BY p.created_at DESC;

-- 4. Проверить что чаты теперь видны
SELECT 
  c.id,
  c.type,
  c.direct_chat_key,
  cm.user_id,
  p.email
FROM chats c
JOIN chat_members cm ON c.id = cm.chat_id
JOIN profiles p ON cm.user_id = p.id
ORDER BY c.created_at DESC;
