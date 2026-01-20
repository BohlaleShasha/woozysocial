-- =====================================================
-- AGENCY TEAM MANAGEMENT MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. AGENCY_TEAM_MEMBERS TABLE
-- Central roster of team members for agency accounts
-- =====================================================
CREATE TABLE IF NOT EXISTS agency_team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Member identification
  email TEXT NOT NULL,
  member_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Team member info
  full_name TEXT,
  default_role TEXT NOT NULL DEFAULT 'editor',
  department TEXT,
  notes TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one email per agency owner
  UNIQUE(agency_owner_id, email)
);

-- Add check constraint for valid roles
ALTER TABLE agency_team_members
  DROP CONSTRAINT IF EXISTS agency_team_members_role_check;
ALTER TABLE agency_team_members
  ADD CONSTRAINT agency_team_members_role_check
  CHECK (default_role IN ('admin', 'editor', 'view_only', 'client'));

-- Add check constraint for valid status
ALTER TABLE agency_team_members
  DROP CONSTRAINT IF EXISTS agency_team_members_status_check;
ALTER TABLE agency_team_members
  ADD CONSTRAINT agency_team_members_status_check
  CHECK (status IN ('pending', 'active', 'inactive'));

-- =====================================================
-- 2. AGENCY_WORKSPACE_PROVISIONS TABLE
-- Audit trail of team provisioning actions
-- =====================================================
CREATE TABLE IF NOT EXISTS agency_workspace_provisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  agency_team_member_id UUID NOT NULL REFERENCES agency_team_members(id) ON DELETE CASCADE,

  -- Provisioning details
  provisioned_role TEXT NOT NULL,
  provision_type TEXT NOT NULL DEFAULT 'direct',

  -- Result tracking
  workspace_member_id UUID REFERENCES workspace_members(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES workspace_invitations(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate provisions
  UNIQUE(workspace_id, agency_team_member_id)
);

-- Add check constraint for provision type
ALTER TABLE agency_workspace_provisions
  DROP CONSTRAINT IF EXISTS agency_provisions_type_check;
ALTER TABLE agency_workspace_provisions
  ADD CONSTRAINT agency_provisions_type_check
  CHECK (provision_type IN ('direct', 'invitation'));

-- Add check constraint for status
ALTER TABLE agency_workspace_provisions
  DROP CONSTRAINT IF EXISTS agency_provisions_status_check;
ALTER TABLE agency_workspace_provisions
  ADD CONSTRAINT agency_provisions_status_check
  CHECK (status IN ('completed', 'pending', 'failed'));

-- =====================================================
-- 3. INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_agency_team_members_owner ON agency_team_members(agency_owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_email ON agency_team_members(email);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_user_id ON agency_team_members(member_user_id);
CREATE INDEX IF NOT EXISTS idx_agency_team_members_status ON agency_team_members(status);

CREATE INDEX IF NOT EXISTS idx_agency_provisions_owner ON agency_workspace_provisions(agency_owner_id);
CREATE INDEX IF NOT EXISTS idx_agency_provisions_workspace ON agency_workspace_provisions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agency_provisions_member ON agency_workspace_provisions(agency_team_member_id);

-- =====================================================
-- 4. ENABLE RLS
-- =====================================================
ALTER TABLE agency_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_workspace_provisions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES FOR AGENCY_TEAM_MEMBERS
-- =====================================================

-- Agency owners can view their own team roster
DROP POLICY IF EXISTS "Agency owners can view own team" ON agency_team_members;
CREATE POLICY "Agency owners can view own team"
  ON agency_team_members FOR SELECT
  USING (auth.uid() = agency_owner_id);

-- Agency owners can insert team members (requires agency subscription)
DROP POLICY IF EXISTS "Agency owners can add team members" ON agency_team_members;
CREATE POLICY "Agency owners can add team members"
  ON agency_team_members FOR INSERT
  WITH CHECK (
    auth.uid() = agency_owner_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND (
          subscription_tier = 'agency'
          OR is_whitelisted = true
        )
        AND (subscription_status = 'active' OR is_whitelisted = true)
    )
  );

-- Agency owners can update their team members
DROP POLICY IF EXISTS "Agency owners can update team members" ON agency_team_members;
CREATE POLICY "Agency owners can update team members"
  ON agency_team_members FOR UPDATE
  USING (auth.uid() = agency_owner_id);

-- Agency owners can delete their team members
DROP POLICY IF EXISTS "Agency owners can delete team members" ON agency_team_members;
CREATE POLICY "Agency owners can delete team members"
  ON agency_team_members FOR DELETE
  USING (auth.uid() = agency_owner_id);

-- =====================================================
-- 6. RLS POLICIES FOR AGENCY_WORKSPACE_PROVISIONS
-- =====================================================

-- Agency owners can view their provisions
DROP POLICY IF EXISTS "Agency owners can view provisions" ON agency_workspace_provisions;
CREATE POLICY "Agency owners can view provisions"
  ON agency_workspace_provisions FOR SELECT
  USING (auth.uid() = agency_owner_id);

-- Agency owners can create provisions (requires agency subscription)
DROP POLICY IF EXISTS "Agency owners can create provisions" ON agency_workspace_provisions;
CREATE POLICY "Agency owners can create provisions"
  ON agency_workspace_provisions FOR INSERT
  WITH CHECK (
    auth.uid() = agency_owner_id AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND (
          subscription_tier = 'agency'
          OR is_whitelisted = true
        )
        AND (subscription_status = 'active' OR is_whitelisted = true)
    )
  );

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Auto-link team members when they register
CREATE OR REPLACE FUNCTION link_agency_team_member()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new user_profile is created, check if they're in any agency rosters
  UPDATE agency_team_members
  SET
    member_user_id = NEW.id,
    status = 'active',
    updated_at = NOW()
  WHERE LOWER(email) = LOWER(NEW.email)
    AND member_user_id IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_link_agency_member ON user_profiles;
CREATE TRIGGER auto_link_agency_member
  AFTER INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION link_agency_team_member();

-- Updated_at trigger for agency_team_members
CREATE OR REPLACE FUNCTION update_agency_team_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_agency_team_members_updated_at ON agency_team_members;
CREATE TRIGGER update_agency_team_members_updated_at
  BEFORE UPDATE ON agency_team_members
  FOR EACH ROW EXECUTE FUNCTION update_agency_team_updated_at();

-- =====================================================
-- 8. VERIFICATION
-- =====================================================
SELECT 'agency_team_members' as table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'agency_team_members';

SELECT 'agency_workspace_provisions' as table_name, COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'agency_workspace_provisions';

SELECT 'Tables created successfully' as status;
