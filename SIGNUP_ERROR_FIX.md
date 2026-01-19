# Signup Error Fix - Duplicate Key Constraint Issue

## Problem Summary

Users were encountering a **500 Internal Server Error** during the signup flow after completing the questionnaire and selecting a plan. The error occurred in the `/api/signup/create-account` endpoint.

### Error Details

```
[ERROR] create-account-profile: {
  message: 'duplicate key value violates unique constraint "user_profiles_pkey"',
  stack: undefined,
  userId: 'cad4ac1f-54f3-441b-b162-8ea16cdb2173',
  email: 'magebazappleid@gmail.com',
  timestamp: '2026-01-19T19:12:05.107Z'
}
```

### Root Cause

The signup process was **not idempotent**, meaning it couldn't handle retries safely. When a user's signup partially succeeded (auth user created) but then failed or timed out before completing, retrying the signup would cause:

1. Auth user already exists with ID `X`
2. Attempt to insert into `user_profiles` with same ID `X`
3. **Duplicate key error** because `user_profiles.id` is a PRIMARY KEY

This happened because:
- Network timeouts during the signup flow
- Multiple rapid form submissions
- Payment webhook delays causing retries
- No duplicate detection logic in the endpoint

---

## Solution Implemented

Made the **create-account** endpoint fully **idempotent** by:

### 1. Early Duplicate Detection

Added a check at the beginning to see if the user already exists:

```javascript
// Check if user already exists in user_profiles
const { data: existingProfile } = await supabase
  .from('user_profiles')
  .select('id, email, onboarding_completed')
  .eq('email', email.toLowerCase())
  .maybeSingle();

if (existingProfile) {
  // If onboarding completed -> tell them to login
  if (existingProfile.onboarding_completed) {
    return sendError(res, "Account already exists. Please login instead.");
  }

  // If onboarding incomplete -> return existing account info for retry
  const { data: existingWorkspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', existingProfile.id)
    .maybeSingle();

  if (existingWorkspace) {
    return sendSuccess(res, {
      userId: existingProfile.id,
      workspaceId: existingWorkspace.id,
      message: "Account already exists, continuing signup"
    });
  }
}
```

**Benefit**: Prevents duplicate auth user creation attempts and allows safe retries.

---

### 2. Upsert for User Profiles

Changed `INSERT` to `UPSERT` to handle duplicate IDs gracefully:

```javascript
// BEFORE (would fail on duplicate):
.insert({ id: userId, email, ... })

// AFTER (handles duplicates):
.upsert({
  id: userId,
  email: email.toLowerCase(),
  full_name: fullName,
  questionnaire_answers: questionnaireAnswers || {},
  onboarding_step: 4,
  onboarding_completed: false
}, {
  onConflict: 'id',
  ignoreDuplicates: false  // Update existing record
})
```

**Benefit**: If profile already exists, it updates instead of failing.

---

### 3. Workspace Duplicate Check

Added logic to reuse existing workspace instead of always creating new:

```javascript
// Check if workspace already exists for this user
const { data: existingWorkspace } = await supabase
  .from('workspaces')
  .select('id')
  .eq('owner_id', userId)
  .maybeSingle();

if (existingWorkspace) {
  workspace = existingWorkspace;
} else {
  // Create new workspace
  const { data: newWorkspace } = await supabase
    .from('workspaces')
    .insert({ ... });
  workspace = newWorkspace;
}
```

**Benefit**: Prevents creating multiple workspaces for the same user on retry.

---

### 4. Workspace Members Upsert

Changed workspace member insertion to use upsert:

```javascript
// BEFORE:
.insert({
  workspace_id: workspace.id,
  user_id: userId,
  role: 'owner'
})

// AFTER:
.upsert({
  workspace_id: workspace.id,
  user_id: userId,
  role: 'owner',
  can_manage_team: true,
  can_manage_settings: true
}, {
  onConflict: 'workspace_id,user_id',
  ignoreDuplicates: false
})
```

**Benefit**: Handles duplicate workspace membership gracefully.

---

## Files Modified

### 1. `/api/signup/create-account.js`

**Changes**:
- Added early duplicate detection (lines 98-133)
- Changed user profile INSERT to UPSERT (lines 167-182)
- Added workspace duplicate check (lines 199-239)
- Changed workspace_members INSERT to UPSERT (lines 243-255)

**Impact**: Signup now safely handles retries without errors

---

## Database Cleanup (Optional)

A cleanup script has been created to remove orphaned auth users (users without profiles):

**File**: `cleanup-orphaned-users.sql`

### How to Use:

1. Open your **Supabase Dashboard** → SQL Editor
2. Copy contents of `cleanup-orphaned-users.sql`
3. Run the **SELECT query first** to see orphaned users
4. Review the results carefully
5. If you want to delete them, **uncomment the DO block** and run again

**⚠️ Warning**: This permanently deletes auth users. Make sure you review the list first.

---

## Deployment Steps

### Step 1: Deploy the Fixed Code

```bash
# From the woozysocial directory
cd woozysocial

# Commit the changes
git add api/signup/create-account.js
git commit -m "Fix: Make signup endpoint idempotent to prevent duplicate key errors"

# Push to trigger Vercel deployment
git push origin master
```

### Step 2: Monitor Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **woozysocial** or **woozysocial-marketing**
3. Wait for deployment to complete
4. Check logs for any deployment errors

### Step 3: Test the Signup Flow

1. Go to your marketing site: `https://woozysocial-marketing.vercel.app/signup`
2. Complete the signup questionnaire
3. Select a plan (try the one that failed before)
4. Complete payment
5. Verify successful redirect to dashboard

### Step 4: Test Retry Scenario

To verify the idempotency fix works:

1. Start a new signup with a different email
2. **Intentionally refresh the page** or **click back/forward** during the process
3. Re-submit the form
4. Should complete successfully without errors

### Step 5: Database Cleanup (If Needed)

If you have orphaned users from previous failed attempts:

1. Open Supabase Dashboard → SQL Editor
2. Run the query from `cleanup-orphaned-users.sql`
3. Review orphaned users
4. Uncomment and run the DELETE block if needed

---

## Testing Checklist

- [ ] New user signup completes successfully
- [ ] User can retry signup if browser is refreshed
- [ ] Existing completed users see "Please login instead" message
- [ ] Existing incomplete users can continue their signup
- [ ] Payment completion still works correctly
- [ ] Auto-login after payment works
- [ ] Dashboard loads with correct workspace
- [ ] No duplicate workspaces created on retry
- [ ] Vercel logs show no errors
- [ ] All environments (dev/prod) updated

---

## How to Verify the Fix in Logs

After deployment, successful retries should show:

```
[CREATE ACCOUNT] Starting account creation for: user@example.com
[CREATE ACCOUNT] User already exists: cad4ac1f-54f3-441b-b162-8ea16cdb2173
[CREATE ACCOUNT] Returning existing account for retry
```

Instead of:
```
[ERROR] create-account-profile: {
  message: 'duplicate key value violates unique constraint "user_profiles_pkey"'
}
```

---

## Rollback Plan (If Needed)

If the fix causes issues:

```bash
# Revert to previous version
git revert HEAD
git push origin master
```

Then restore the original `create-account.js` from your backup or git history.

---

## Prevention for Future

To prevent similar issues:

1. **Always design critical endpoints to be idempotent**
2. **Use upserts instead of inserts for user-related tables**
3. **Add early duplicate detection** before expensive operations
4. **Test retry scenarios** during development
5. **Monitor Vercel logs** for duplicate key errors
6. **Add request deduplication** in the marketing site frontend

---

## Contact

If you encounter any issues after deployment:

1. Check Vercel logs for errors
2. Review Supabase database for orphaned records
3. Test in a different browser/incognito mode
4. Check network tab for failed API calls

---

## Technical Details

**Database Constraint**: `user_profiles_pkey` on column `id` (UUID)
**Endpoint**: `POST /api/signup/create-account`
**Auth Method**: Supabase Admin API (`auth.admin.createUser`)
**Fix Type**: Idempotency improvement with upsert operations

**Performance Impact**: Minimal (adds one additional SELECT query per signup)
**Breaking Changes**: None
**Backward Compatible**: Yes

---

## Summary

✅ **Fixed**: Duplicate key constraint errors during signup
✅ **Made**: Signup endpoint fully idempotent
✅ **Added**: Early duplicate detection
✅ **Changed**: INSERTs to UPSERTs for all user-related tables
✅ **Created**: Database cleanup script for orphaned records

**Status**: Ready for deployment
**Testing**: Recommended before production rollout
**Risk Level**: Low (backward compatible changes)
