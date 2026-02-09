-- =============================================
-- Role Migration: 5-role → 3-role + toggles
-- =============================================
-- COMPLETED: 2026-02-09
--
-- IMPORTANT: Supabase SQL editor runs scripts as a single transaction.
-- If any step fails, ALL changes roll back. Run each step as a SEPARATE query.
--
-- New model:
--   owner  = full access (unchanged)
--   member = can create/edit own posts
--   viewer = read-only client portal
--   + can_approve_posts toggle (any role except owner who always can)
--   + can_manage_team toggle (any role except owner who always can)

-- =============================================
-- STEP 1: Drop all CHECK constraints (run separately)
-- =============================================

ALTER TABLE workspace_members
DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE workspace_invitations
DROP CONSTRAINT IF EXISTS workspace_invitations_role_check;

ALTER TABLE agency_team_members
DROP CONSTRAINT IF EXISTS agency_team_members_default_role_check;

-- =============================================
-- STEP 2: Migrate all data (run separately)
-- =============================================

-- workspace_members: admin → member (both toggles ON)
UPDATE workspace_members
SET role = 'member', can_approve_posts = true, can_manage_team = true
WHERE role = 'admin';

-- workspace_members: editor → member (both toggles OFF)
UPDATE workspace_members
SET role = 'member', can_approve_posts = false, can_manage_team = false
WHERE role = 'editor';

-- workspace_members: client → viewer (can_approve ON)
UPDATE workspace_members
SET role = 'viewer', can_approve_posts = true, can_manage_team = false
WHERE role = 'client';

-- workspace_members: view_only → viewer (both toggles OFF)
UPDATE workspace_members
SET role = 'viewer', can_approve_posts = false, can_manage_team = false
WHERE role = 'view_only';

-- workspace_invitations: ALL rows (not just pending)
UPDATE workspace_invitations SET role = 'member' WHERE role IN ('admin', 'editor');
UPDATE workspace_invitations SET role = 'viewer' WHERE role IN ('client', 'view_only');

-- agency_team_members
UPDATE agency_team_members SET default_role = 'member' WHERE default_role IN ('admin', 'editor');
UPDATE agency_team_members SET default_role = 'viewer' WHERE default_role IN ('client', 'view_only');

-- =============================================
-- STEP 3: Add tight constraints (run separately)
-- =============================================

ALTER TABLE workspace_members
ADD CONSTRAINT workspace_members_role_check
CHECK (role IN ('owner', 'member', 'viewer'));

ALTER TABLE workspace_invitations
ADD CONSTRAINT workspace_invitations_role_check
CHECK (role IN ('owner', 'member', 'viewer'));
