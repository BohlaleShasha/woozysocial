-- =============================================
-- WORKSPACE-ONLY PROFILE KEYS MIGRATION
-- =============================================
-- This migration implements the cleaner architecture where:
-- - ONLY workspaces have Ayrshare profile keys
-- - Users don't have profile keys; they access workspaces that do
-- - Subscription is tied to the user, workspace count tied to plan tier
--
-- Flow:
-- 1. User signs up -> no profile key
-- 2. User subscribes -> creates workspace -> Ayrshare profile created -> key stored in workspace
-- 3. User upgrades to Agency -> can create more workspaces, each with own profile key
-- 4. Team members -> access the workspace's profile key, never have their own
-- =============================================

-- STEP 1: Add subscription fields to workspaces table
-- (Some plans allow multiple workspaces, track which plan created each)
-- =============================================

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT NULL;

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS created_from_payment BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN workspaces.subscription_tier IS 'The subscription tier that created this workspace (solo, pro, pro_plus, agency, brand_bolt)';
COMMENT ON COLUMN workspaces.created_from_payment IS 'Whether this workspace was auto-created from a payment';

-- STEP 2: Keep subscription_status on user_profiles (users own subscriptions)
-- But remove ayr_profile_key from user_profiles (only workspaces have keys)
-- =============================================

-- First, migrate any user profile keys to their owned workspaces (if they have one)
-- This preserves existing data
UPDATE workspaces w
SET ayr_profile_key = up.ayr_profile_key
FROM user_profiles up
JOIN workspace_members wm ON wm.user_id = up.id AND wm.role = 'owner'
WHERE w.id = wm.workspace_id
  AND w.ayr_profile_key IS NULL
  AND up.ayr_profile_key IS NOT NULL;

-- STEP 3: Add plan limits tracking
-- =============================================

-- Track how many workspaces each plan allows
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_workspaces INTEGER NOT NULL DEFAULT 1,
  max_team_members INTEGER NOT NULL DEFAULT 1,
  max_scheduled_posts INTEGER,  -- NULL means unlimited
  price_monthly INTEGER NOT NULL,  -- in cents/pence
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert plan definitions
INSERT INTO subscription_plans (id, name, max_workspaces, max_team_members, max_scheduled_posts, price_monthly, features)
VALUES
  ('solo', 'Solo', 1, 1, 50, 3500, '["1 social profile", "50 scheduled posts/month", "Basic analytics", "Email support"]'::jsonb),
  ('pro', 'Pro', 1, 2, 150, 5000, '["3 social profiles", "150 scheduled posts/month", "Team collaboration (2 users)", "Priority email support"]'::jsonb),
  ('pro_plus', 'Pro Plus', 1, 5, NULL, 11500, '["5 social profiles", "Unlimited scheduled posts", "Team collaboration (5 users)", "Client approvals", "Advanced analytics"]'::jsonb),
  ('agency', 'Agency', 5, 15, NULL, 28800, '["15 social profiles", "Unlimited everything", "Team collaboration (15 users)", "Client portal", "White label branding"]'::jsonb),
  ('brand_bolt', 'BrandBolt', 1, 1, 30, 2500, '["1 social profile", "30 scheduled posts/month", "Basic analytics"]'::jsonb),
  ('internal', 'Internal', 10, 50, NULL, 0, '["Internal use only", "Full access"]'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  max_workspaces = EXCLUDED.max_workspaces,
  max_team_members = EXCLUDED.max_team_members,
  max_scheduled_posts = EXCLUDED.max_scheduled_posts,
  price_monthly = EXCLUDED.price_monthly,
  features = EXCLUDED.features;

-- STEP 4: Add subscription_tier to user_profiles if not exists
-- =============================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT NULL;

COMMENT ON COLUMN user_profiles.subscription_tier IS 'The users current subscription tier (solo, pro, pro_plus, agency, brand_bolt, internal)';

-- STEP 5: Verify the changes
-- =============================================

SELECT 'workspaces columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'workspaces'
  AND column_name IN ('ayr_profile_key', 'subscription_tier', 'created_from_payment')
ORDER BY ordinal_position;

SELECT 'user_profiles columns:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN ('subscription_status', 'subscription_tier', 'stripe_customer_id', 'stripe_subscription_id', 'ayr_profile_key')
ORDER BY ordinal_position;

SELECT 'subscription_plans:' as info;
SELECT id, name, max_workspaces, max_team_members, price_monthly FROM subscription_plans;

-- =============================================
-- NOTE: We're NOT dropping ayr_profile_key from user_profiles yet
-- to maintain backwards compatibility during transition.
-- Once confirmed working, run:
--
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS ayr_profile_key;
-- ALTER TABLE user_profiles DROP COLUMN IF EXISTS ayr_ref_id;
-- =============================================
