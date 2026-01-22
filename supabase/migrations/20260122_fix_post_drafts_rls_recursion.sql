-- Fix infinite recursion in post_drafts RLS policies
-- The issue is caused by policies checking workspace_members which has its own RLS

-- First ensure the helper function exists (may have been created by brand_profiles fix)
CREATE OR REPLACE FUNCTION auth.user_is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspace_uuid
      AND workspace_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop ALL existing policies on post_drafts
DROP POLICY IF EXISTS "Users can view their own drafts" ON post_drafts;
DROP POLICY IF EXISTS "Users can create their own drafts" ON post_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON post_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON post_drafts;
DROP POLICY IF EXISTS "Members can view drafts" ON post_drafts;
DROP POLICY IF EXISTS "Members can create drafts" ON post_drafts;
DROP POLICY IF EXISTS "Members can update drafts" ON post_drafts;
DROP POLICY IF EXISTS "Members can delete drafts" ON post_drafts;
DROP POLICY IF EXISTS "Workspace members can view drafts" ON post_drafts;
DROP POLICY IF EXISTS "Workspace members can create drafts" ON post_drafts;
DROP POLICY IF EXISTS "Workspace members can update drafts" ON post_drafts;
DROP POLICY IF EXISTS "Workspace members can delete drafts" ON post_drafts;

-- Create new policies using SECURITY DEFINER function to avoid recursion
-- Users can view drafts for workspaces they're members of OR their own drafts
CREATE POLICY "View drafts"
  ON post_drafts FOR SELECT
  USING (
    auth.uid() = user_id
    OR (workspace_id IS NOT NULL AND auth.user_is_workspace_member(workspace_id))
  );

-- Users can create drafts for workspaces they're members of
CREATE POLICY "Create drafts"
  ON post_drafts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (workspace_id IS NULL OR auth.user_is_workspace_member(workspace_id))
  );

-- Users can update their own drafts or drafts in their workspace
CREATE POLICY "Update drafts"
  ON post_drafts FOR UPDATE
  USING (
    auth.uid() = user_id
    OR (workspace_id IS NOT NULL AND auth.user_is_workspace_member(workspace_id))
  )
  WITH CHECK (
    auth.uid() = user_id
    OR (workspace_id IS NOT NULL AND auth.user_is_workspace_member(workspace_id))
  );

-- Users can delete their own drafts or drafts in their workspace
CREATE POLICY "Delete drafts"
  ON post_drafts FOR DELETE
  USING (
    auth.uid() = user_id
    OR (workspace_id IS NOT NULL AND auth.user_is_workspace_member(workspace_id))
  );
