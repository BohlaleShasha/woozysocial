-- Migration: Add Logo Support to User Profiles
-- Description: Adds logo_url column for company/user logo
-- Created: 2025-12-31

BEGIN;

-- Add logo_url column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.logo_url IS 'URL to user/company logo stored in Supabase Storage';

COMMIT;

-- Verify the migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name = 'logo_url';
