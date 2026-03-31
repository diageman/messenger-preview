-- =====================================================
-- AUTH FIXES: Auto-profile creation + RLS for updates
-- =====================================================

-- 1. Auto-create profile trigger (после создания auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  org_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Get or create organization
  INSERT INTO organizations (id, name, slug)
  VALUES (org_id, 'Таксопарк "Линия"', 'taxi-line')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    organization_id,
    full_name,
    email,
    role,
    status
  )
  VALUES (
    NEW.id,
    org_id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Сотрудник'),
    NEW.email,
    'Сотрудник',
    'online'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after INSERT on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. RLS Policy для UPDATE профиля (только свой профиль)
DROP POLICY IF EXISTS users_update_own_profile ON profiles;
CREATE POLICY users_update_own_profile ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. RLS Policy для INSERT профиля (разрешить триггеру)
DROP POLICY IF EXISTS users_insert_own_profile ON profiles;
CREATE POLICY users_insert_own_profile ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. Enable email autoconfirm (опционально, для test mode)
-- В Supabase Dashboard: Authentication → Providers → Email
-- [ ] Enable email confirmations ← OFF

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates profile when auth.users row is inserted';
