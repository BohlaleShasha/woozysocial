# Fix All RLS Infinite Recursion Issues

## The Problem
Multiple tables (brand_profiles, post_drafts, posts, connected_accounts) have RLS policies that cause infinite recursion when checking workspace_members.

## The Solution
We already created the `public.user_is_workspace_member()` function for brand_profiles. Now we need to apply the same fix to all other workspace tables.

## Run This SQL in Supabase SQL Editor:

```sql
-- The security definer function should already exist from brand_profiles fix
-- If not, create it:
CREATE OR REPLACE FUNCTION public.user_is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspace_uuid
      AND workspace_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.user_is_workspace_member(UUID) TO authenticated;

-- ============================================
-- FIX POST_DRAFTS RLS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view drafts in their workspaces" ON post_drafts;
DROP POLICY IF EXISTS "Users can insert drafts in their workspaces" ON post_drafts;
DROP POLICY IF EXISTS "Users can update drafts in their workspaces" ON post_drafts;
DROP POLICY IF EXISTS "Users can delete drafts in their workspaces" ON post_drafts;

-- Create new non-recursive policies
CREATE POLICY "Users can view drafts in their workspaces"
  ON post_drafts FOR SELECT
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can insert drafts in their workspaces"
  ON post_drafts FOR INSERT
  WITH CHECK (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can update drafts in their workspaces"
  ON post_drafts FOR UPDATE
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  )
  WITH CHECK (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can delete drafts in their workspaces"
  ON post_drafts FOR DELETE
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

-- ============================================
-- FIX POSTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view posts in their workspaces" ON posts;
DROP POLICY IF EXISTS "Users can insert posts in their workspaces" ON posts;
DROP POLICY IF EXISTS "Users can update posts in their workspaces" ON posts;
DROP POLICY IF EXISTS "Users can delete posts in their workspaces" ON posts;

-- Create new non-recursive policies
CREATE POLICY "Users can view posts in their workspaces"
  ON posts FOR SELECT
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can insert posts in their workspaces"
  ON posts FOR INSERT
  WITH CHECK (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can update posts in their workspaces"
  ON posts FOR UPDATE
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  )
  WITH CHECK (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can delete posts in their workspaces"
  ON posts FOR DELETE
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

-- ============================================
-- FIX CONNECTED_ACCOUNTS RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view accounts in their workspaces" ON connected_accounts;
DROP POLICY IF EXISTS "Users can insert accounts in their workspaces" ON connected_accounts;
DROP POLICY IF EXISTS "Users can update accounts in their workspaces" ON connected_accounts;
DROP POLICY IF EXISTS "Users can delete accounts in their workspaces" ON connected_accounts;

-- Create new non-recursive policies
CREATE POLICY "Users can view accounts in their workspaces"
  ON connected_accounts FOR SELECT
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can insert accounts in their workspaces"
  ON connected_accounts FOR INSERT
  WITH CHECK (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can update accounts in their workspaces"
  ON connected_accounts FOR UPDATE
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  )
  WITH CHECK (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );

CREATE POLICY "Users can delete accounts in their workspaces"
  ON connected_accounts FOR DELETE
  USING (
    workspace_id IS NULL AND user_id = auth.uid()
    OR public.user_is_workspace_member(workspace_id)
  );
```

## What This Does:

1. Uses the existing `public.user_is_workspace_member()` SECURITY DEFINER function
2. Fixes RLS policies on `post_drafts`, `posts`, and `connected_accounts` tables
3. Each policy uses the security definer function to avoid recursion
4. Maintains backwards compatibility with `workspace_id IS NULL` checks

## After Running:

1. All drafts, posts, and connected accounts should load properly
2. No more infinite recursion errors
3. Brand profile should continue working
