-- =====================================================
-- COMPLETE DATABASE SETUP FOR WOOZY SOCIAL
-- Run this entire script in Supabase SQL Editor
-- It will create/update all tables safely (won't break existing data)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USER_PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  ayr_profile_key TEXT,
  ayr_ref_id TEXT,
  last_workspace_id UUID,
  workspace_preferences JSONB DEFAULT '{}',
  is_deactivated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_workspace_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS workspace_preferences JSONB DEFAULT '{}';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 2. WORKSPACES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  ayr_profile_key TEXT,
  ayr_ref_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ayr_profile_key TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS ayr_ref_id TEXT;

-- =====================================================
-- 3. WORKSPACE_MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor', -- 'owner', 'admin', 'editor', 'view_only'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Add columns if missing
ALTER TABLE workspace_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- 4. WORKSPACE_INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired', 'cancelled'
  invite_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, email)
);

-- Add columns if missing
ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days';
ALTER TABLE workspace_invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- =====================================================
-- 5. POSTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  ayr_post_id TEXT,
  caption TEXT,
  media_urls TEXT[],
  status TEXT DEFAULT 'draft', -- 'draft', 'pending_approval', 'scheduled', 'posted', 'failed'
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  platforms TEXT[],
  last_error TEXT,
  approval_status TEXT DEFAULT 'approved', -- 'pending', 'approved', 'rejected', 'changes_requested'
  requires_approval BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE posts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS ayr_post_id TEXT;

-- =====================================================
-- 6. POST_APPROVALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)
);

-- =====================================================
-- 7. POST_COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing (handle old 'content' column)
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename content to comment if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_comments' AND column_name = 'content')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'post_comments' AND column_name = 'comment') THEN
    ALTER TABLE post_comments RENAME COLUMN content TO comment;
  END IF;
END $$;

-- Add comment column if neither exists
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS comment TEXT;

-- =====================================================
-- 8. CONNECTED_ACCOUNTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- Add columns if missing
ALTER TABLE connected_accounts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- =====================================================
-- 9. BRAND_PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_name TEXT,
  brand_voice TEXT,
  target_audience TEXT,
  industry TEXT,
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE brand_profiles ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- =====================================================
-- 10. POST_DRAFTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  content TEXT,
  media_urls TEXT[],
  platforms JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if missing
ALTER TABLE post_drafts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- =====================================================
-- 11. TEAM_MEMBERS TABLE (legacy support)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, member_id)
);

-- =====================================================
-- 12. TEAM_INVITATIONS TABLE (legacy support)
-- =====================================================
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'editor',
  status TEXT DEFAULT 'pending',
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, email)
);

-- =====================================================
-- 13. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_posts_workspace ON posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_approval_status ON posts(approval_status);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(invite_token);

CREATE INDEX IF NOT EXISTS idx_post_approvals_post ON post_approvals(post_id);
CREATE INDEX IF NOT EXISTS idx_post_approvals_workspace ON post_approvals(workspace_id);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);

CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_workspace ON connected_accounts(workspace_id);

-- =====================================================
-- 14. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 15. RLS POLICIES - USER_PROFILES
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow viewing profiles of workspace members
DROP POLICY IF EXISTS "Workspace members can view each other" ON user_profiles;
CREATE POLICY "Workspace members can view each other"
  ON user_profiles FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid() AND wm2.user_id = user_profiles.id
    )
  );

-- =====================================================
-- 16. RLS POLICIES - WORKSPACES
-- =====================================================
DROP POLICY IF EXISTS "Members can view workspaces" ON workspaces;
CREATE POLICY "Members can view workspaces"
  ON workspaces FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
CREATE POLICY "Owners can update workspaces"
  ON workspaces FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;
CREATE POLICY "Owners can delete workspaces"
  ON workspaces FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role = 'owner'
    )
  );

-- =====================================================
-- 17. RLS POLICIES - WORKSPACE_MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "Members can view workspace members" ON workspace_members;
CREATE POLICY "Members can view workspace members"
  ON workspace_members FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can add workspace members" ON workspace_members;
CREATE POLICY "Admins can add workspace members"
  ON workspace_members FOR INSERT WITH CHECK (
    (auth.uid() = user_id AND role = 'owner')
    OR EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update workspace members" ON workspace_members;
CREATE POLICY "Admins can update workspace members"
  ON workspace_members FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can remove workspace members" ON workspace_members;
CREATE POLICY "Admins can remove workspace members"
  ON workspace_members FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 18. RLS POLICIES - WORKSPACE_INVITATIONS
-- =====================================================
DROP POLICY IF EXISTS "Members can view workspace invitations" ON workspace_invitations;
CREATE POLICY "Members can view workspace invitations"
  ON workspace_invitations FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can create invitations" ON workspace_invitations;
CREATE POLICY "Admins can create invitations"
  ON workspace_invitations FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON workspace_invitations;
CREATE POLICY "Admins can update invitations"
  ON workspace_invitations FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Admins can delete invitations" ON workspace_invitations;
CREATE POLICY "Admins can delete invitations"
  ON workspace_invitations FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 19. RLS POLICIES - POSTS
-- =====================================================
DROP POLICY IF EXISTS "Members can view workspace posts" ON posts;
CREATE POLICY "Members can view workspace posts"
  ON posts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create posts" ON posts;
CREATE POLICY "Members can create posts"
  ON posts FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update posts" ON posts;
CREATE POLICY "Members can update posts"
  ON posts FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete posts" ON posts;
CREATE POLICY "Members can delete posts"
  ON posts FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 20. RLS POLICIES - POST_APPROVALS
-- =====================================================
DROP POLICY IF EXISTS "Members can view post approvals" ON post_approvals;
CREATE POLICY "Members can view post approvals"
  ON post_approvals FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_approvals.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can manage approvals" ON post_approvals;
CREATE POLICY "Members can manage approvals"
  ON post_approvals FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_approvals.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 21. RLS POLICIES - POST_COMMENTS
-- =====================================================
DROP POLICY IF EXISTS "Members can view post comments" ON post_comments;
CREATE POLICY "Members can view post comments"
  ON post_comments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_comments.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can add comments" ON post_comments;
CREATE POLICY "Members can add comments"
  ON post_comments FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_comments.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own comments" ON post_comments;
CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON post_comments;
CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 22. RLS POLICIES - POST_DRAFTS
-- =====================================================
DROP POLICY IF EXISTS "Members can view workspace drafts" ON post_drafts;
CREATE POLICY "Members can view workspace drafts"
  ON post_drafts FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_drafts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create drafts" ON post_drafts;
CREATE POLICY "Members can create drafts"
  ON post_drafts FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_drafts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update drafts" ON post_drafts;
CREATE POLICY "Members can update drafts"
  ON post_drafts FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_drafts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete drafts" ON post_drafts;
CREATE POLICY "Members can delete drafts"
  ON post_drafts FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_drafts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 23. UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_approvals_updated_at ON post_approvals;
CREATE TRIGGER update_post_approvals_updated_at
  BEFORE UPDATE ON post_approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_comments_updated_at ON post_comments;
CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON post_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 24. VERIFICATION QUERIES
-- =====================================================

-- Show all tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show posts columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'posts'
ORDER BY ordinal_position;

-- Show workspace_members columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'workspace_members'
ORDER BY ordinal_position;

-- =====================================================
-- DONE! Your database is now fully configured.
-- =====================================================