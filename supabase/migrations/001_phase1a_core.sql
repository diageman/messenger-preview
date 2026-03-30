-- =====================================================
-- MESSENGER DATABASE SCHEMA - PHASE 1A
-- =====================================================
-- Tables: organizations, profiles, departments, 
--         department_members, user_settings, user_presence
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Organizations (multi-tenancy)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  full_name text NOT NULL,
  role text NOT NULL,
  avatar_url text,
  phone text,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'busy', 'away', 'dnd', 'offline')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, email)
);

-- Departments
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(organization_id, name)
);

-- Department Members
CREATE TABLE IF NOT EXISTS department_members (
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('head', 'member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (department_id, user_id)
);

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Presence (ephemeral)
CREATE TABLE IF NOT EXISTS user_presence (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_org ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_user ON department_members(user_id);
CREATE INDEX IF NOT EXISTS idx_presence_online ON user_presence(is_online);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's organization
CREATE OR REPLACE FUNCTION current_user_organization()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS org_isolation ON organizations;
DROP POLICY IF EXISTS org_profiles_visible ON profiles;
DROP POLICY IF EXISTS org_departments_visible ON departments;
DROP POLICY IF EXISTS dept_members_visible ON department_members;
DROP POLICY IF EXISTS user_settings_own ON user_settings;
DROP POLICY IF EXISTS presence_visible ON user_presence;

-- Organizations: users can see their own organization
CREATE POLICY org_isolation ON organizations FOR SELECT
  USING (id = current_user_organization());

-- Profiles: users can see profiles in their organization
CREATE POLICY org_profiles_visible ON profiles FOR SELECT
  USING (organization_id = current_user_organization());

-- Departments: users can see departments in their organization
CREATE POLICY org_departments_visible ON departments FOR SELECT
  USING (organization_id = current_user_organization());

-- Department Members: users can see members in their organization's departments
CREATE POLICY dept_members_visible ON department_members FOR SELECT
  USING (
    department_id IN (
      SELECT id FROM departments
      WHERE organization_id = current_user_organization()
    )
  );

-- User Settings: users can only see/edit their own
CREATE POLICY user_settings_own ON user_settings FOR ALL
  USING (user_id = auth.uid());

-- User Presence: org-wide visibility
CREATE POLICY presence_visible ON user_presence FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles
      WHERE organization_id = current_user_organization()
    )
  );

-- =====================================================
-- SEED DATA (FOR DEVELOPMENT)
-- =====================================================

-- Create default organization
INSERT INTO organizations (id, name, slug)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Таксопарк "Линия"', 'taxi-line')
ON CONFLICT (id) DO NOTHING;

-- Create departments
INSERT INTO departments (organization_id, name, description)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Диспетчерская служба', 'Приём и обработка заказов'),
  ('00000000-0000-0000-0000-000000000001', 'Бухгалтерия', 'Финансовый учёт и расчёты'),
  ('00000000-0000-0000-0000-000000000001', 'HR-отдел', 'Подбор и адаптация сотрудников'),
  ('00000000-0000-0000-0000-000000000001', 'IT-отдел', 'Техническая поддержка и разработка'),
  ('00000000-0000-0000-0000-000000000001', 'Поддержка', 'Работа с обращениями клиентов')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE organizations IS 'Organizations for multi-tenancy';
COMMENT ON TABLE profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE departments IS 'Organizational departments';
COMMENT ON TABLE department_members IS 'Department membership mapping';
COMMENT ON TABLE user_settings IS 'User preferences and settings';
COMMENT ON TABLE user_presence IS 'Ephemeral user presence tracking';
COMMENT ON FUNCTION current_user_organization() IS 'Get current authenticated user organization';
