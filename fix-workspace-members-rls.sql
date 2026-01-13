-- Fix RLS policies for workspace_members table to allow invitation acceptance
-- This ensures users can be added to workspaces when accepting invitations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners and admins can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Allow service role full access" ON workspace_members;

-- Enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view members of workspaces they belong to
CREATE POLICY "Users can view workspace members"
ON workspace_members
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Allow inserting new members (for invitation acceptance)
-- This is the CRITICAL policy that was missing/broken
CREATE POLICY "Users can insert workspace members"
ON workspace_members
FOR INSERT
WITH CHECK (true);  -- Allow all inserts from authenticated users via API

-- Policy 3: Workspace owners and admins can update/delete members
CREATE POLICY "Workspace owners and admins can manage members"
ON workspace_members
FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id
    FROM workspace_members
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Policy 4: Service role (API) has full access
CREATE POLICY "Allow service role full access"
ON workspace_members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY policyname;
