# Subscription & Whitelist Implementation Roadmap

## Overview
Shift from auto-creating Ayrshare profiles at signup to payment-gated profile creation with whitelist testing support.

---

## Phase 1: Database Schema Updates

### Tasks:
1. **Update user_profiles table**
   - Add `subscription_status` column (TEXT, default 'inactive')
   - Add `subscription_tier` column (TEXT, nullable) - 'starter', 'pro', 'enterprise'
   - Add `profile_created_at` column (TIMESTAMPTZ, nullable)
   - Add `is_whitelisted` column (BOOLEAN, default false)

2. **Migration SQL script**
   - Create `migrations/add-subscription-fields.sql`
   - Include rollback statements
   - Document what each field does

3. **Verify existing data**
   - Check current users with ayr_profile_key
   - Mark them as 'active' subscribers
   - Set profile_created_at to created_at for existing users

**Expected outcome:** Database ready to track subscription status

---

## Phase 2: Environment Configuration

### Tasks:
1. **Update functions/.env**
   - Add `TEST_ACCOUNT_EMAILS` whitelist
   - Add your development emails
   - Add `SUBSCRIPTION_REQUIRED` flag (true/false)
   - Add `NODE_ENV` (development/production)

2. **Update .gitignore**
   - Ensure `.env` is ignored
   - Create `.env.example` template

3. **Document environment variables**
   - Add comments explaining each variable
   - Provide examples

**Expected outcome:** Environment configured for testing vs production

---

## Phase 3: Remove Auto-Creation at Signup

### Tasks:
1. **Update AuthContext.jsx**
   - Remove `/api/create-user-profile` call from signup
   - Keep user_profiles row creation (without Ayrshare API call)
   - Add subscription_status = 'inactive' by default

2. **Update server.js create-user-profile endpoint**
   - Remove automatic profile creation
   - Only create database row with NULL ayr_profile_key
   - Return user profile without profile key

3. **Test signup flow**
   - Verify new users can sign up
   - Verify no Ayrshare API call is made
   - Verify user_profiles row is created correctly

**Expected outcome:** Signup creates account but NOT Ayrshare profile

---

## Phase 4: Whitelist Check Function

### Tasks:
1. **Create whitelist utility in server.js**
   ```javascript
   function isWhitelistedEmail(email)
   function shouldHaveProfileAccess(email, subscriptionStatus)
   ```

2. **Add whitelist middleware**
   - Check if user is whitelisted OR has active subscription
   - Return appropriate error messages
   - Log access attempts for debugging

3. **Test whitelist logic**
   - Test with whitelisted email
   - Test with non-whitelisted email
   - Test with active subscription

**Expected outcome:** Whitelist checking works correctly

---

## Phase 5: Profile Activation Endpoint

### Tasks:
1. **Create `/api/subscription/activate-profile` endpoint**
   - Accept userId, email, tier (optional)
   - Check if whitelisted OR valid payment
   - Create Ayrshare profile via API
   - Update user_profiles with profile key
   - Set subscription_status = 'active'
   - Set profile_created_at timestamp

2. **Add manual activation endpoint for testing**
   - Create `/api/admin/activate-test-account`
   - Only works for whitelisted emails
   - Allows manual testing without payment

3. **Test profile activation**
   - Activate whitelisted account
   - Verify Ayrshare profile created
   - Verify database updated correctly

**Expected outcome:** Can activate profiles for whitelisted users

---

## Phase 6: Guard Ayrshare Endpoints

### Tasks:
1. **Create subscription middleware**
   ```javascript
   async function requireActiveProfile(req, res, next)
   ```
   - Check user has ayr_profile_key
   - Check subscription_status OR whitelisted
   - Return 403 with upgrade message if not authorized

2. **Apply middleware to ALL Ayrshare endpoints**
   - `/api/post`
   - `/api/post-history`
   - `/api/user-accounts`
   - `/api/generate-jwt`
   - `/api/delete-post`
   - `/api/update-post`
   - Any other Ayrshare API calls

3. **Test locked endpoints**
   - Verify non-subscribers get 403
   - Verify whitelisted users have access
   - Verify error messages are helpful

**Expected outcome:** All Ayrshare features locked behind subscription

---

## Phase 7: Workspace Context for Team Members

### Tasks:
1. **Create workspace resolution function**
   ```javascript
   async function getWorkspaceProfileKey(userId)
   ```
   - Check if user is a team member
   - If member, return owner's profile key
   - If owner, return own profile key
   - Handle users with no team

2. **Update all Ayrshare API calls**
   - Replace `getUserProfileKey(userId)`
   - Use `getWorkspaceProfileKey(userId)` instead
   - Ensures team members inherit owner's profile

3. **Test team inheritance**
   - Owner creates post → Uses owner's key
   - Member creates post → Uses owner's key
   - Both see same connected accounts

**Expected outcome:** Team members use owner's Ayrshare profile

---

## Phase 8: Frontend Subscription State

### Tasks:
1. **Update AuthContext**
   - Add `subscriptionStatus` to context
   - Add `hasActiveProfile` boolean
   - Add `isWhitelisted` flag
   - Fetch subscription data on login

2. **Create SubscriptionGuard component**
   - Show upgrade banner for inactive users
   - Block features with overlay
   - Link to pricing page

3. **Update UI for locked features**
   - Disable social account connection button
   - Show "Subscribe to unlock" on compose page
   - Add upgrade prompts throughout app

**Expected outcome:** UI reflects subscription status

---

## Phase 9: Testing Workflow Setup

### Tasks:
1. **Create test account activation UI**
   - Add hidden `/test-admin` page
   - Button to activate whitelisted accounts
   - Only visible in development mode

2. **Document testing process**
   - How to add email to whitelist
   - How to activate test accounts
   - How to test both subscriber and non-subscriber flows

3. **Create test scenarios**
   - New user (no subscription)
   - Whitelisted user (development)
   - Paid user (active subscription)
   - Team member (inherits owner's key)

**Expected outcome:** Easy testing workflow for development

---

## Phase 10: Payment Integration Preparation

### Tasks:
1. **Create Stripe webhook endpoint**
   - `/api/webhooks/stripe`
   - Verify webhook signature
   - Handle `checkout.session.completed` event
   - Call profile activation

2. **Add subscription cancellation handler**
   - Handle `customer.subscription.deleted` event
   - Set subscription_status = 'cancelled'
   - Don't delete profile key (keep data)

3. **Test webhook locally**
   - Use Stripe CLI for testing
   - Forward webhooks to localhost
   - Verify profile activation on payment

**Expected outcome:** Ready for Stripe integration

---

## Phase 11: Migration Strategy for Existing Users

### Tasks:
1. **Identify existing users**
   - Query users with ayr_profile_key
   - List users without profile key

2. **Mark existing users as active**
   - Update subscription_status = 'active'
   - Set profile_created_at = created_at
   - Set subscription_tier = 'legacy' or 'grandfathered'

3. **Communicate changes**
   - Email existing users about new system
   - Offer special pricing for early adopters

**Expected outcome:** Existing users not disrupted

---

## Phase 12: Final Testing & Launch

### Tasks:
1. **End-to-end testing**
   - Sign up new user → No profile
   - Whitelist email → Can activate
   - Non-whitelisted → Sees upgrade prompt
   - Payment → Profile created automatically
   - Team invite → Member inherits owner's key

2. **Performance testing**
   - Test with multiple concurrent users
   - Verify no profile key leaks
   - Check API rate limits

3. **Security audit**
   - Verify whitelist can't be bypassed
   - Check all endpoints require auth
   - Test payment webhook security

4. **Deploy to production**
   - Update environment variables
   - Run migrations on production database
   - Monitor for errors

**Expected outcome:** System live and working in production

---

## Success Criteria

✅ New signups don't create Ayrshare profiles automatically
✅ Whitelisted emails can activate profiles for testing
✅ Non-subscribers see upgrade prompts
✅ Payment activates Ayrshare profile automatically
✅ Team members use owner's profile key
✅ All Ayrshare features locked behind subscription
✅ Existing users not disrupted
✅ Testing workflow is smooth

---

## Rollback Plan

If something goes wrong:

1. **Quick rollback:** Set `SUBSCRIPTION_REQUIRED=false` in .env
2. **Database rollback:** Run rollback migration to remove new columns
3. **Code rollback:** Restore auto-creation in AuthContext.jsx
4. **Communication:** Notify users of temporary issue

---

## Estimated Timeline

- **Phase 1-3:** 2-3 hours (Database & signup changes)
- **Phase 4-6:** 3-4 hours (Whitelist & endpoint guards)
- **Phase 7-8:** 2-3 hours (Workspace context & UI)
- **Phase 9:** 1-2 hours (Testing setup)
- **Phase 10-11:** 3-4 hours (Payment & migration)
- **Phase 12:** 2-3 hours (Final testing)

**Total:** ~15-20 hours of focused development

---

## Notes

- Keep detailed logs during migration
- Test each phase before moving to next
- Don't skip Phase 9 (testing workflow) - it saves time later
- Document any deviations from this plan
- Ask for help if stuck on any phase
