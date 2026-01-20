# Supabase Project Migration Plan

## Problem
Current Supabase project has a corrupted auth schema preventing user creation, even after removing all foreign key constraints.

## Solution
Create a fresh Supabase project and migrate schema properly.

---

## Step 1: Commit Current State
```bash
cd woozysocial
git add -A
git commit -m "Save current state before Supabase migration"
git push
```

## Step 2: Create New Supabase Project
1. Go to https://supabase.com/dashboard
2. Create new project (suggest name: woozysocial-v2 or woozysocial-prod)
3. Save credentials:
   - Project URL
   - Anon/Public Key
   - Service Role Key (secret)

## Step 3: Run Migrations in Correct Order
Run these migrations in the NEW Supabase project SQL editor:

### Order matters:
1. `migrations/001_workspace_schema.sql` - BUT REMOVE all `REFERENCES auth.users(id)` constraints
2. `migrations/002_add_workspaces_simple.sql` - Remove FK constraints
3. `migrations/003_workspace_invites_and_approvals.sql` - Remove FK constraints
4. `migrations/004_inbox_tables.sql` - Remove FK constraints
5. `migrations/005_notifications_table.sql` - Remove FK constraints
6. `migrations/006_enhanced_comments.sql`
7. `migrations/007_fix_comment_relationships.sql`
8. `migrations/008_support_draft_comments.sql`
9. `migrations/009_onboarding_and_signup.sql` - Use the fixed version without FK to auth.users
10. `migrations/010_agency_team_management.sql` - Remove FK constraints
11. Any other migrations

## Step 4: Update Environment Variables

### In Vercel (woozysocial project):
- `SUPABASE_URL` = new project URL
- `SUPABASE_SERVICE_ROLE_KEY` = new service role key
- `VITE_SUPABASE_URL` = new project URL
- `VITE_SUPABASE_ANON_KEY` = new anon key

### In Vercel (woozysocial-marketing project):
- `SUPABASE_URL` = new project URL
- `SUPABASE_SERVICE_ROLE_KEY` = new service role key

### Local .env files:
- Update both projects

## Step 5: Configure Supabase Settings
1. **Authentication → Settings:**
   - Enable Email provider
   - Set Site URL: `https://woozysocial.com`
   - Set Redirect URLs: `https://woozysocial.com/**`, `https://www.woozysocials.com/**`

2. **Storage:**
   - Create buckets as needed (post-images, profile-pictures, etc.)

3. **API Settings:**
   - Note: No special config needed for JWT

## Step 6: Test
1. Create test user in Supabase dashboard (should work now!)
2. Test signup flow from marketing site
3. Test login
4. Test existing features

## Step 7: Migrate Data (if needed)
If you have production data in old project:
1. Export data using Supabase dashboard (Database → Backups)
2. Or use pg_dump/pg_restore
3. Import into new project

---

## Important: DO NOT add foreign key constraints to auth.users
Never use `REFERENCES auth.users(id)` - it causes circular dependencies that break user creation.

Instead:
- Just store UUIDs without FK constraints
- Data integrity is maintained through application logic
- Use triggers if you need to clean up orphaned records
