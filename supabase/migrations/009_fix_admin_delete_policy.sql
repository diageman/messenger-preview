-- =====================================================
-- FIX: Admin delete profiles RLS policy
-- =====================================================
-- Previous policy checked is_admin on TARGET row, not current user
-- =====================================================

DROP POLICY IF EXISTS admin_delete_profiles ON profiles;

CREATE POLICY admin_delete_profiles ON profiles FOR DELETE
  USING (
    id != auth.uid()
    AND organization_id = current_user_organization()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

COMMENT ON POLICY admin_delete_profiles ON profiles IS 
  'Allow admins to delete other profiles in their organization';