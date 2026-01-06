-- =====================================================
-- WORKSPACE INVITATIONS & POST APPROVAL SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. ADD OWNER_ID TO WORKSPACES (if not exists)
-- =====================================================
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- =====================================================
-- 2. CREATE WORKSPACE_INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client', -- 'admin', 'editor', 'client'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  invite_token UUID NOT NULL DEFAULT uuid_generate_v4(),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(workspace_id, email)
);

-- =====================================================
-- 3. CREATE POST_APPROVALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Approval status
  approval_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'changes_requested'

  -- Who reviewed it
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(post_id)
);

-- =====================================================
-- 4. CREATE POST_COMMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Comment content
  comment TEXT NOT NULL,

  -- Is this a system comment (approval/rejection) or user comment
  is_system BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. ADD APPROVAL_STATUS TO POSTS TABLE
-- =====================================================
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;

-- =====================================================
-- 6. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_approvals_post ON post_approvals(post_id);
CREATE INDEX IF NOT EXISTS idx_post_approvals_workspace ON post_approvals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_post_approvals_status ON post_approvals(approval_status);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_approval_status ON posts(approval_status);

-- =====================================================
-- 7. ENABLE RLS
-- =====================================================
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. RLS POLICIES FOR WORKSPACE_INVITATIONS
-- =====================================================

-- Workspace members can view invitations
CREATE POLICY "Members can view workspace invitations"
  ON workspace_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- Users can view invitations sent to their email
CREATE POLICY "Users can view invitations to their email"
  ON workspace_invitations FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Owners/admins can create invitations
CREATE POLICY "Admins can create invitations"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Owners/admins can update invitations
CREATE POLICY "Admins can update invitations"
  ON workspace_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- Owners/admins can delete invitations
CREATE POLICY "Admins can delete invitations"
  ON workspace_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invitations.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- 9. RLS POLICIES FOR POST_APPROVALS
-- =====================================================

-- Workspace members can view approvals
CREATE POLICY "Members can view post approvals"
  ON post_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_approvals.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- Clients can approve/reject posts
CREATE POLICY "Clients can manage approvals"
  ON post_approvals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_approvals.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 10. RLS POLICIES FOR POST_COMMENTS
-- =====================================================

-- Workspace members can view comments
CREATE POLICY "Members can view post comments"
  ON post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_comments.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- Workspace members can add comments
CREATE POLICY "Members can add comments"
  ON post_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = post_comments.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON post_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 11. UPDATE WORKSPACE_MEMBERS TO ALLOW CLIENT INVITES
-- =====================================================

-- Allow owners/admins to add members (for accepting invites)
DROP POLICY IF EXISTS "Users can add themselves as workspace owner" ON workspace_members;

CREATE POLICY "Admins can add workspace members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    -- User can add themselves as owner (creating workspace)
    (auth.uid() = user_id AND role = 'owner')
    OR
    -- Or admin/owner can add anyone
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- DONE! Now deploy the API endpoints
-- =====================================================
