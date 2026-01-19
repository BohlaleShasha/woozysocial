-- Migration: Add onboarding and signup revamp columns
-- Created: 2026-01-19
-- Purpose: Add columns needed for marketing site signup flow and token login

-- 1. Add onboarding columns to workspaces table
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'complete',
ADD COLUMN IF NOT EXISTS questionnaire_data JSONB DEFAULT '{}';

-- 2. Add onboarding columns to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS questionnaire_answers JSONB DEFAULT '{}';

-- 3. Create login_tokens table for token-based auto-login
CREATE TABLE IF NOT EXISTS login_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_login_tokens_token ON login_tokens(token);
CREATE INDEX IF NOT EXISTS idx_login_tokens_user ON login_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_login_tokens_expires ON login_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_workspaces_onboarding_status ON workspaces(onboarding_status);

-- 5. Add comments for documentation
COMMENT ON COLUMN workspaces.onboarding_status IS 'Tracks onboarding progress: pending_payment, payment_completed, complete';
COMMENT ON COLUMN workspaces.questionnaire_data IS 'Stores answers from marketing site questionnaire';
COMMENT ON COLUMN user_profiles.onboarding_completed IS 'Whether user has completed full onboarding';
COMMENT ON COLUMN user_profiles.onboarding_step IS 'Current step in onboarding process (0-6)';
COMMENT ON COLUMN user_profiles.questionnaire_answers IS 'Stores user questionnaire responses';
COMMENT ON TABLE login_tokens IS 'One-time login tokens for auto-login after payment';

-- 6. Enable RLS on login_tokens (users can only access their own tokens)
ALTER TABLE login_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login tokens"
  ON login_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies - only backend can manage tokens

-- 7. Create function to clean up expired tokens (optional but recommended)
CREATE OR REPLACE FUNCTION cleanup_expired_login_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM login_tokens
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$;

-- 8. Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_login_tokens() TO authenticated;

COMMENT ON FUNCTION cleanup_expired_login_tokens IS 'Deletes login tokens that expired more than 1 day ago';
