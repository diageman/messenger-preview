-- =====================================================
-- AUTH FIXES: Auto-profile creation + RLS for updates
-- =====================================================

-- 1. Auto-create profile trigger (после создания auth.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_full_name text;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (
    id,
    organization_id,
    full_name,
    role,
    email,
    status
  )
  VALUES (
    NEW.id,
    v_org_id,
    v_full_name,
    'Сотрудник',
    NEW.email,
    'online'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Trigger after INSERT on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates profile when auth.users row is inserted';
