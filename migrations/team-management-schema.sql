-- =============================================
-- TEAM MANAGEMENT SCHEMA UPDATES
-- Run these SQL commands in Supabase SQL Editor
-- =============================================

-- STEP 1: Update team_members table to add new columns
-- =============================================

-- Add 'invited_by' column to track who invited the member
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);

-- Add 'joined_at' column to track when they accepted the invite
ALTER TABLE team_members
ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- The 'role' column already exists, but we need to ensure it supports 'view_only'
-- No schema change needed - we just need to use 'view_only' as a value
-- Possible values: 'admin', 'editor', 'view_only'

-- Add comment to document the role column
COMMENT ON COLUMN team_members.role IS 'Member role: admin, editor, or view_only';


-- STEP 2: Create team_invitations table
-- =============================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor', -- 'admin', 'editor', 'view_only'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired', 'cancelled'
  invite_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one user can't be invited twice by the same owner
  UNIQUE(owner_id, email)
);

-- Add comments for documentation
COMMENT ON TABLE team_invitations IS 'Tracks pending and completed team member invitations';
COMMENT ON COLUMN team_invitations.invite_token IS 'Unique token used in invitation email link';
COMMENT ON COLUMN team_invitations.status IS 'Invitation status: pending, accepted, rejected, expired, cancelled';


-- STEP 3: Add missing UPDATE policy for team_members table
-- =============================================
-- (team_members already has SELECT, INSERT, DELETE policies)
-- We need to add UPDATE so owners can change member roles

CREATE POLICY "Owners can update team member roles"
  ON team_members FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);


-- STEP 4: Enable Row Level Security on team_invitations
-- =============================================

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invitations they sent
CREATE POLICY "Users can view invitations they sent"
  ON team_invitations FOR SELECT
  USING (auth.uid() = owner_id);

-- Policy: Users can view invitations sent to their email
CREATE POLICY "Users can view invitations to their email"
  ON team_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Policy: Users can create invitations (send invites)
CREATE POLICY "Users can send invitations"
  ON team_invitations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own invitations (cancel, resend)
CREATE POLICY "Users can update their own invitations"
  ON team_invitations FOR UPDATE
  USING (auth.uid() = owner_id);

-- Policy: Users can delete their own invitations
CREATE POLICY "Users can delete their own invitations"
  ON team_invitations FOR DELETE
  USING (auth.uid() = owner_id);


-- STEP 5: Create index for faster queries
-- =============================================

-- Index for finding invitations by email (for accept flow)
CREATE INDEX IF NOT EXISTS idx_team_invitations_email
  ON team_invitations(email);

-- Index for finding invitations by token (for accept flow)
CREATE INDEX IF NOT EXISTS idx_team_invitations_token
  ON team_invitations(invite_token);

-- Index for finding pending invitations
CREATE INDEX IF NOT EXISTS idx_team_invitations_status
  ON team_invitations(status);


-- STEP 5: Create function to automatically expire old invitations
-- =============================================

CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
  UPDATE team_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- STEP 6: Verify the changes
-- =============================================

-- Check team_members columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'team_members'
ORDER BY ordinal_position;

-- Check team_invitations table exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'team_invitations'
ORDER BY ordinal_position;

-- Check policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'team_invitations';
