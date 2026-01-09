-- =============================================
-- STRIPE INTEGRATION MIGRATION
-- Adds Stripe customer and subscription tracking to user_profiles table
-- Run this in Supabase SQL Editor
-- =============================================

-- STEP 1: Add Stripe columns to user_profiles
-- =============================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id
ON user_profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_subscription_id
ON user_profiles(stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.stripe_customer_id IS 'Stripe customer ID (cus_xxx) for payment processing';
COMMENT ON COLUMN user_profiles.stripe_subscription_id IS 'Stripe subscription ID (sub_xxx) for recurring billing';

-- =============================================
-- STEP 2: Verify the changes
-- =============================================

-- Check the new columns exist
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('stripe_customer_id', 'stripe_subscription_id')
ORDER BY ordinal_position;

-- =============================================
-- ROLLBACK (if needed)
-- Run this ONLY if you need to undo the changes
-- =============================================

/*
-- Remove the columns and indexes
DROP INDEX IF EXISTS idx_user_profiles_stripe_customer_id;
DROP INDEX IF EXISTS idx_user_profiles_stripe_subscription_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS stripe_customer_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS stripe_subscription_id;
*/
