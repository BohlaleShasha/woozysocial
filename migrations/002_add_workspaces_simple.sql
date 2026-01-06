-- Simple Workspace Migration for Multi-Business Support
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. CREATE WORKSPACES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,

  -- Ayrshare integration (each workspace gets its own profile)
  ayr_profile_key TEXT,
  ayr_ref_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE WORKSPACE_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, user_id)
);

-- =====================================================
-- 3. ADD WORKSPACE_ID TO EXISTING TABLES
-- =====================================================

-- Add to user_profiles (for remembering last workspace)
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS last_workspace_id UUID REFERENCES workspaces(id);

-- Add to posts
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add to connected_accounts
ALTER TABLE connected_accounts
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_workspace ON posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_workspace ON connected_accounts(workspace_id);

-- =====================================================
-- 5. ENABLE RLS ON NEW TABLES
-- =====================================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES FOR WORKSPACES
-- =====================================================

-- Anyone can create a workspace
CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view workspaces they're members of
CREATE POLICY "Users can view their workspaces"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- Members can update their workspaces
CREATE POLICY "Members can update workspaces"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. RLS POLICIES FOR WORKSPACE_MEMBERS
-- =====================================================

-- Anyone can add themselves as owner of a new workspace
CREATE POLICY "Users can add themselves as workspace owner"
  ON workspace_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND role = 'owner'
  );

-- Users can view members of their workspaces
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

-- =====================================================
-- 8. UPDATE POSTS POLICIES TO INCLUDE WORKSPACE
-- =====================================================

-- Drop old policies and create new ones that support both user_id and workspace_id
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;
DROP POLICY IF EXISTS "Team members can view owner's posts" ON posts;

CREATE POLICY "Users can view posts"
  ON posts FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 9. UPDATE CONNECTED_ACCOUNTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own connected accounts" ON connected_accounts;
DROP POLICY IF EXISTS "Team members can view owner's connected accounts" ON connected_accounts;

CREATE POLICY "Users can view connected accounts"
  ON connected_accounts FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = connected_accounts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- DONE! Now run the API to create your first workspace
-- =====================================================
