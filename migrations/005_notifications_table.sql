-- =====================================================
-- NOTIFICATIONS TABLE MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Notification content
  type TEXT NOT NULL, -- See notification types below
  title TEXT NOT NULL,
  message TEXT,

  -- Related entities (optional, for navigation)
  post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  invitation_id UUID REFERENCES workspace_invitations(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Who triggered the notification

  -- Metadata for additional context
  metadata JSONB DEFAULT '{}',

  -- State
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES workspace_invitations(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- =====================================================
-- 2. NOTIFICATION TYPES REFERENCE
-- =====================================================
-- Approval workflow:
--   'approval_request'      - Post needs client approval
--   'post_approved'         - Client approved the post
--   'post_rejected'         - Client rejected the post
--   'changes_requested'     - Client requested changes
--
-- Workspace/Team:
--   'workspace_invite'      - Invited to join workspace
--   'invite_accepted'       - Someone accepted your invite
--   'invite_declined'       - Someone declined your invite
--   'invite_cancelled'      - Your invitation was cancelled
--   'role_changed'          - Your role in workspace changed
--   'member_joined'         - New member joined workspace
--   'member_removed'        - Member was removed from workspace
--
-- Posts/Scheduling:
--   'post_scheduled'        - Post was scheduled
--   'post_published'        - Post was published successfully (immediate or scheduled)
--   'post_failed'           - Post failed to publish
--   'post_reminder'         - Reminder about upcoming post
--
-- Comments:
--   'new_comment'           - New comment on a post you're involved with
--   'comment_mention'       - Someone mentioned you in a comment
--
-- Social Accounts:
--   'social_account_linked'   - Social account connected to workspace
--   'social_account_unlinked' - Social account disconnected from workspace
--
-- Social Inbox:
--   'inbox_message'         - New message in social inbox
--   'inbox_mention'         - Someone mentioned you on social

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow inserting notifications for workspace members
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. UPDATED_AT TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. AUTO-SET read_at TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_notification_read_at_trigger ON notifications;
CREATE TRIGGER set_notification_read_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_notification_read_at();

-- =====================================================
-- 8. NOTIFICATION PREFERENCES TABLE (optional)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email preferences
  email_approval_requests BOOLEAN DEFAULT TRUE,
  email_post_approved BOOLEAN DEFAULT TRUE,
  email_post_rejected BOOLEAN DEFAULT TRUE,
  email_workspace_invites BOOLEAN DEFAULT TRUE,
  email_new_comments BOOLEAN DEFAULT TRUE,
  email_inbox_messages BOOLEAN DEFAULT FALSE,

  -- In-app preferences (all default to true)
  app_approval_requests BOOLEAN DEFAULT TRUE,
  app_post_approved BOOLEAN DEFAULT TRUE,
  app_post_rejected BOOLEAN DEFAULT TRUE,
  app_workspace_invites BOOLEAN DEFAULT TRUE,
  app_role_changes BOOLEAN DEFAULT TRUE,
  app_new_comments BOOLEAN DEFAULT TRUE,
  app_post_scheduled BOOLEAN DEFAULT TRUE,
  app_post_published BOOLEAN DEFAULT TRUE,
  app_inbox_messages BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS on preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can manage their own preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- 9. VERIFICATION
-- =====================================================
SELECT
  'notifications' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'notifications';

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
