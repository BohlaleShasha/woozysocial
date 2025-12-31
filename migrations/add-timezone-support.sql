-- Migration: Add Timezone Support to User Profiles
-- Description: Adds timezone column to user_profiles table for proper scheduling
-- Created: 2025-12-31

BEGIN;

-- Add timezone column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.timezone IS 'User''s preferred timezone for scheduling posts (IANA timezone format)';

COMMIT;

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'timezone';
