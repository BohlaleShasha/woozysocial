-- Migration: Add Notification Preferences to User Profiles
-- Description: Adds columns for email notifications, weekly summaries, and team activity alerts
-- Created: 2025-12-31

BEGIN;

-- Add notification preference columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS weekly_summaries BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS team_activity_alerts BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.email_notifications IS 'User preference for receiving email notifications';
COMMENT ON COLUMN user_profiles.weekly_summaries IS 'User preference for receiving weekly summary emails';
COMMENT ON COLUMN user_profiles.team_activity_alerts IS 'User preference for receiving team activity notifications';

COMMIT;

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('email_notifications', 'weekly_summaries', 'team_activity_alerts');
