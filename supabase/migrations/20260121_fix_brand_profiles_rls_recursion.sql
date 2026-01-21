-- Fix infinite recursion in brand_profiles RLS policies
-- The issue is caused by policies checking workspace_members which may have its own RLS

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Members can manage brand profiles" ON brand_profiles;

-- Create simpler policies that avoid recursion by using security definer function
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

-- Users can view brand profiles for their workspaces
CREATE POLICY "Members can view brand profiles"
  ON brand_profiles FOR SELECT
  USING (auth.user_is_workspace_member(workspace_id));

-- All members can insert/update/delete brand profiles
CREATE POLICY "Members can insert brand profiles"
  ON brand_profiles FOR INSERT
  WITH CHECK (auth.user_is_workspace_member(workspace_id));

CREATE POLICY "Members can update brand profiles"
  ON brand_profiles FOR UPDATE
  USING (auth.user_is_workspace_member(workspace_id))
  WITH CHECK (auth.user_is_workspace_member(workspace_id));

CREATE POLICY "Members can delete brand profiles"
  ON brand_profiles FOR DELETE
  USING (auth.user_is_workspace_member(workspace_id));
