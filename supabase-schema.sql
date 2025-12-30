-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. USER_PROFILES TABLE
-- Stores extended user data + Ayrshare credentials
-- =============================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  -- Ayrshare Profile Key (one per user)
  ayr_profile_key TEXT UNIQUE,
  ayr_ref_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. TEAM_MEMBERS TABLE
-- Allows users to invite collaborators
-- =============================================
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor', -- 'admin' or 'editor'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(owner_id, member_id)
);

-- =============================================
-- 3. CONNECTED_ACCOUNTS TABLE
-- Tracks which social platforms are linked
-- =============================================
CREATE TABLE connected_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  platform_user_id TEXT,
  platform_username TEXT,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, platform_user_id)
);

-- =============================================
-- 4. POSTS TABLE
-- Stores drafts, scheduled, and published posts
-- =============================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  ayr_post_id TEXT,
  caption TEXT,
  media_urls TEXT[],
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'posted', 'failed'
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  platforms TEXT[],
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 5. POST_COMMENTS TABLE
-- Internal team notes on posts
-- =============================================
CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- USER_PROFILES POLICIES
-- Users can read their own profile
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- TEAM_MEMBERS POLICIES
-- Users can view teams where they are owner or member
CREATE POLICY "Users can view teams they're part of"
  ON team_members FOR SELECT
  USING (auth.uid() = owner_id OR auth.uid() = member_id);

-- Only owners can invite team members
CREATE POLICY "Owners can invite team members"
  ON team_members FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Only owners can remove team members
CREATE POLICY "Owners can remove team members"
  ON team_members FOR DELETE
  USING (auth.uid() = owner_id);

-- CONNECTED_ACCOUNTS POLICIES
-- Users can view their own connected accounts
CREATE POLICY "Users can view their own connected accounts"
  ON connected_accounts FOR SELECT
  USING (auth.uid() = user_id);

-- Team members can view owner's connected accounts
CREATE POLICY "Team members can view owner's connected accounts"
  ON connected_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = connected_accounts.user_id
        AND team_members.member_id = auth.uid()
    )
  );

-- Users can insert/update/delete their own connected accounts
CREATE POLICY "Users can manage their own connected accounts"
  ON connected_accounts FOR ALL
  USING (auth.uid() = user_id);

-- POSTS POLICIES
-- Users can view their own posts
CREATE POLICY "Users can view their own posts"
  ON posts FOR SELECT
  USING (auth.uid() = user_id);

-- Team members can view owner's posts
CREATE POLICY "Team members can view owner's posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = posts.user_id
        AND team_members.member_id = auth.uid()
    )
  );

-- Users can create posts for themselves
CREATE POLICY "Users can create their own posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Team members can create posts for the owner
CREATE POLICY "Team members can create posts for owner"
  ON posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = posts.user_id
        AND team_members.member_id = auth.uid()
    )
  );

-- Users and team members can update posts
CREATE POLICY "Users and team members can update posts"
  ON posts FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = posts.user_id
        AND team_members.member_id = auth.uid()
    )
  );

-- Users and team members can delete posts
CREATE POLICY "Users and team members can delete posts"
  ON posts FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = posts.user_id
        AND team_members.member_id = auth.uid()
    )
  );

-- POST_COMMENTS POLICIES
-- Users can view comments on posts they have access to
CREATE POLICY "Users can view comments on accessible posts"
  ON post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_comments.post_id
        AND (
          posts.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.owner_id = posts.user_id
              AND team_members.member_id = auth.uid()
          )
        )
    )
  );

-- Users can create comments on posts they have access to
CREATE POLICY "Users can create comments on accessible posts"
  ON post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_comments.post_id
        AND (
          posts.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM team_members
            WHERE team_members.owner_id = posts.user_id
              AND team_members.member_id = auth.uid()
          )
        )
    )
  );

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for connected_accounts
CREATE TRIGGER update_connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for posts
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_team_members_owner ON team_members(owner_id);
CREATE INDEX idx_team_members_member ON team_members(member_id);
CREATE INDEX idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_post_comments_post ON post_comments(post_id);
