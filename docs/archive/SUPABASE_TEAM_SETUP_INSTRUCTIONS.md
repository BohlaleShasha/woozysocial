# Supabase Team Management Setup Instructions

## How to Run the Migration in Supabase

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Click on **"SQL Editor"** in the left sidebar
3. Click **"New query"** button

### Step 2: Copy and Paste the Migration
1. Open the file: `migrations/team-management-schema.sql`
2. Copy **ALL** the content from that file
3. Paste it into the Supabase SQL Editor

### Step 3: Run the Migration
1. Click the **"Run"** button (or press `Ctrl+Enter`)
2. Wait for it to complete (should take a few seconds)
3. You should see "Success. No rows returned" at the bottom

### Step 4: Verify It Worked
Scroll to the bottom of the results. You should see:

**team_members columns:**
- id
- owner_id
- member_id
- role
- created_at
- **invited_by** ← NEW!
- **joined_at** ← NEW!

**team_invitations table:**
- Should show all the columns listed in the migration

---

## What This Migration Does

### Updates to `team_members` table:
- ✅ Adds `invited_by` column (tracks who invited this member)
- ✅ Adds `joined_at` column (tracks when they accepted)
- ✅ Documents that `role` can be: 'admin', 'editor', or 'view_only'

### Creates `team_invitations` table:
- Stores pending invitations before they're accepted
- Tracks invitation status (pending, accepted, rejected, etc.)
- Has a unique invite token for email links
- Auto-expires after 7 days

### Security:
- ✅ Row Level Security enabled
- ✅ Users can only see their own invitations
- ✅ Users can see invitations sent to their email

---

## Troubleshooting

### Error: "relation already exists"
**Solution**: The table already exists. That's okay! The migration uses `IF NOT EXISTS` so it won't break anything.

### Error: "column already exists"
**Solution**: The column already exists. That's okay! The migration uses `ADD COLUMN IF NOT EXISTS` so it won't break anything.

### Error: "policy already exists"
**Solution**: Delete the existing policies first:
1. Go to **Database** → **Policies**
2. Find `team_invitations` policies
3. Delete them
4. Run the migration again

---

## After Running the Migration

You're ready to start building the team management features! The database is now set up to support:
- ✅ Sending invitations
- ✅ Tracking who invited who
- ✅ Managing roles (Admin, Editor, View Only)
- ✅ Accepting/rejecting invitations
- ✅ Auto-expiring old invitations
