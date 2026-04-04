-- =====================================================
-- ADMIN ROLE + CONTACTS MANAGEMENT
-- =====================================================
-- 1. Add is_admin field to profiles
-- 2. Add RLS policy for admin to delete profiles
-- 3. Set admin flag for creator account
-- =====================================================

-- 1. Add is_admin column (default false for all new users)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- 2. Update auto-create trigger to include is_admin = false
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
    status,
    is_admin
  )
  VALUES (
    NEW.id,
    v_org_id,
    v_full_name,
    'Сотрудник',
    NEW.email,
    'online',
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. RLS Policy: Admin can delete profiles in their organization
DROP POLICY IF EXISTS admin_delete_profiles ON profiles;
CREATE POLICY admin_delete_profiles ON profiles FOR DELETE
  USING (
    is_admin = true 
    AND id != auth.uid()
    AND organization_id = current_user_organization()
  );

-- 4. RLS Policy: Admin can update any profile in their organization
DROP POLICY IF EXISTS admin_update_profiles ON profiles;
CREATE POLICY admin_update_profiles ON profiles FOR UPDATE
  USING (
    is_admin = true
    AND organization_id = current_user_organization()
  )
  WITH CHECK (
    is_admin = true
    AND organization_id = current_user_organization()
  );

-- =====================================================
-- MANUAL: Set admin for your account
-- Run this manually in Supabase SQL Editor:
-- =====================================================
-- UPDATE profiles 
-- SET is_admin = true 
-- WHERE email = 'd1ageman@yandex.ru';
-- =====================================================

COMMENT ON COLUMN profiles.is_admin IS 'Admin flag - can delete other profiles in organization';