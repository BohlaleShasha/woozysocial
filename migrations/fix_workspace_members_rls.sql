-- Fix infinite recursion in workspace_members RLS policies
-- ============================================================
-- The problem: RLS policies on workspace_members were querying
-- workspace_members to check permissions, causing infinite recursion.
--
-- Solution: Use simpler policies that don't self-reference, or
-- use SECURITY DEFINER functions to bypass RLS during checks.

-- ============================================================
-- Step 1: Create a SECURITY DEFINER function to check membership
-- This function bypasses RLS policies, avoiding recursion
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- ============================================================
-- Step 2: Drop existing problematic policies
-- ============================================================

DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can add workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can remove workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can update members" ON workspace_members;
DROP POLICY IF EXISTS "Admins can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Users can add themselves as workspace owner" ON workspace_members;

-- ============================================================
-- Step 3: Create new non-recursive policies using the functions
-- ============================================================

-- SELECT: Members can view other members in their workspace
CREATE POLICY "workspace_members_select_policy"
  ON workspace_members FOR SELECT
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
  );

-- INSERT: Users can add themselves as owner (creating workspace) OR admins can add members
CREATE POLICY "workspace_members_insert_policy"
  ON workspace_members FOR INSERT
  WITH CHECK (
    -- Allow user to add themselves as owner (when creating a new workspace)
    (auth.uid() = user_id AND role = 'owner')
    OR
    -- Allow admins to add other members
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- UPDATE: Only admins can update member records
CREATE POLICY "workspace_members_update_policy"
  ON workspace_members FOR UPDATE
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- DELETE: Only admins can remove members
CREATE POLICY "workspace_members_delete_policy"
  ON workspace_members FOR DELETE
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- ============================================================
-- Step 4: Grant execute permissions on the functions
-- ============================================================

GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin(UUID, UUID) TO service_role;

-- ============================================================
-- Step 5: Also fix workspace_invitations policies that reference workspace_members
-- ============================================================

DROP POLICY IF EXISTS "Members can view workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON workspace_invitations;

CREATE POLICY "workspace_invitations_select_policy"
  ON workspace_invitations FOR SELECT
  USING (
    public.is_workspace_member(workspace_id, auth.uid())
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "workspace_invitations_insert_policy"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

CREATE POLICY "workspace_invitations_update_policy"
  ON workspace_invitations FOR UPDATE
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

CREATE POLICY "workspace_invitations_delete_policy"
  ON workspace_invitations FOR DELETE
  USING (
    public.is_workspace_admin(workspace_id, auth.uid())
  );

-- ============================================================
-- Step 6: Fix policies on other tables that reference workspace_members
-- ============================================================

-- Posts policies
DROP POLICY IF EXISTS "Members can view workspace posts" ON posts;
DROP POLICY IF EXISTS "Members can create workspace posts" ON posts;
DROP POLICY IF EXISTS "Members can update workspace posts" ON posts;
DROP POLICY IF EXISTS "Members can delete workspace posts" ON posts;

CREATE POLICY "posts_select_policy"
  ON posts FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "posts_insert_policy"
  ON posts FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "posts_update_policy"
  ON posts FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_workspace_member(workspace_id, auth.uid())
  );

CREATE POLICY "posts_delete_policy"
  ON posts FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_workspace_admin(workspace_id, auth.uid())
  );

-- ============================================================
-- Verify the fix
-- ============================================================
SELECT 'RLS policies fixed successfully' AS result;
