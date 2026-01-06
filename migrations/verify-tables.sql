-- Verify workspace_members table has permission columns
-- Run this in Supabase SQL Editor

-- 1. Check workspace_members columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'workspace_members'
ORDER BY ordinal_position;

-- 2. Check workspace_invitations columns (especially status)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'workspace_invitations'
ORDER BY ordinal_position;

-- 3. Check your current workspace membership and permissions
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
WHERE up.email = 'magebazappleid@gmail.com';

-- 4. Check for any pending invitations
SELECT *
FROM workspace_invitations
WHERE workspace_id = '202c9c3e-fd81-4bec-ae09-4f9f008601bc'
ORDER BY created_at DESC
LIMIT 5;
