-- Add permission columns to workspace_members table
-- Run this in your Supabase SQL Editor

-- Add permission columns if they don't exist
ALTER TABLE workspace_members
ADD COLUMN IF NOT EXISTS can_manage_team BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_posts BOOLEAN DEFAULT true;

-- Update all owners to have full permissions
UPDATE workspace_members
SET
  can_manage_team = true,
  can_manage_settings = true,
  can_delete_posts = true
WHERE role = 'owner';

-- Update all admins to have team and settings permissions
UPDATE workspace_members
SET
  can_manage_team = true,
  can_manage_settings = true,
  can_delete_posts = true
WHERE role = 'admin';

-- Verify the update
SELECT
  wm.workspace_id,
  wm.user_id,
  up.email,
  wm.role,
  wm.can_manage_team,
  wm.can_manage_settings,
  wm.can_delete_posts
FROM workspace_members wm
JOIN user_profiles up ON wm.user_id = up.id
ORDER BY wm.role;

-- Show summary by role
SELECT
  role,
  COUNT(*) as member_count,
  COUNT(CASE WHEN can_manage_team THEN 1 END) as can_manage_team_count,
  COUNT(CASE WHEN can_manage_settings THEN 1 END) as can_manage_settings_count,
  COUNT(CASE WHEN can_delete_posts THEN 1 END) as can_delete_posts_count
FROM workspace_members
GROUP BY role
ORDER BY role;
