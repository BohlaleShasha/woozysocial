-- =====================================================
-- Add missing can_approve_posts column to workspace_members
-- =====================================================
-- This column was expected by the code but missing from the table
-- Causing "Not a workspace member" errors during membership checks
-- =====================================================

-- Add the missing column with a default value based on role
ALTER TABLE public.workspace_members
ADD COLUMN IF NOT EXISTS can_approve_posts BOOLEAN DEFAULT false;

-- Update existing records based on their role
-- Owners, admins, and clients can approve posts
UPDATE public.workspace_members
SET can_approve_posts = true
WHERE role IN ('owner', 'admin', 'client');

-- Update existing records where editors/view_only cannot approve
UPDATE public.workspace_members
SET can_approve_posts = false
WHERE role IN ('editor', 'view_only') OR can_approve_posts IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.workspace_members.can_approve_posts IS
  'Permission to approve posts in approval workflows. True for owner/admin/client roles.';

-- =====================================================
-- Verify the change
-- =====================================================
SELECT
  'Column added successfully' as status,
  COUNT(*) as total_members,
  SUM(CASE WHEN can_approve_posts = true THEN 1 ELSE 0 END) as can_approve,
  SUM(CASE WHEN can_approve_posts = false THEN 1 ELSE 0 END) as cannot_approve
FROM public.workspace_members;
