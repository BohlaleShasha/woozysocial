-- Add status column to workspace_invitations table
-- Run this in your Supabase SQL Editor

-- Add status column if it doesn't exist
ALTER TABLE workspace_invitations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Update existing invitations to 'pending' status
-- (if they were accepted, accepted_at would be set)
UPDATE workspace_invitations
SET status = CASE
  WHEN accepted_at IS NOT NULL THEN 'accepted'
  ELSE 'pending'
END
WHERE status IS NULL;

-- Add check constraint for valid status values
ALTER TABLE workspace_invitations
DROP CONSTRAINT IF EXISTS workspace_invitations_status_check;

ALTER TABLE workspace_invitations
ADD CONSTRAINT workspace_invitations_status_check
CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));

-- Create index for status column (for faster queries)
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_status
ON workspace_invitations(status);

-- Verify the column was added
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'workspace_invitations'
AND column_name = 'status';

-- Show all invitations with their status
SELECT
  wi.id,
  wi.workspace_id,
  wi.email,
  wi.role,
  wi.status,
  wi.created_at,
  wi.expires_at,
  wi.accepted_at,
  up.email as invited_by_email
FROM workspace_invitations wi
LEFT JOIN user_profiles up ON wi.invited_by = up.id
ORDER BY wi.created_at DESC
LIMIT 10;
