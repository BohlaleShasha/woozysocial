# Workspace Permissions Migration ✅

## Problem

The `workspace_members` table was missing permission columns:
- `can_manage_team`
- `can_manage_settings`
- `can_delete_posts`

This caused "You do not have permission to invite members" errors for workspace owners.

---

## Solution

### 1. Add Permission Columns to Database

**Run this migration:** [migrations/add-workspace-permissions.sql](migrations/add-workspace-permissions.sql)

```sql
-- Add permission columns
ALTER TABLE workspace_members
ADD COLUMN IF NOT EXISTS can_manage_team BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete_posts BOOLEAN DEFAULT true;

-- Set permissions for existing owners
UPDATE workspace_members
SET
  can_manage_team = true,
  can_manage_settings = true,
  can_delete_posts = true
WHERE role = 'owner';

-- Set permissions for existing admins
UPDATE workspace_members
SET
  can_manage_team = true,
  can_manage_settings = true,
  can_delete_posts = true
WHERE role = 'admin';
```

---

### 2. Backend Code Already Updated

The backend code already checks for role-based permissions:

**File:** `functions/server.js`

```javascript
// Owners and admins always have permission
const hasPermission = membership && (
  membership.role === 'owner' ||      // ✅ Owners auto-approved
  membership.role === 'admin' ||       // ✅ Admins auto-approved
  membership.can_manage_team === true  // ✅ Or explicit permission
);
```

**Applied to:**
- `/api/workspaces/:id/invite` (line 1529-1534)
- `/api/workspaces/:id/invitations` (line 1595-1600)

---

## Permission Matrix

| Role | can_manage_team | can_manage_settings | can_delete_posts | Notes |
|------|----------------|---------------------|------------------|-------|
| **owner** | ✅ true | ✅ true | ✅ true | Full permissions |
| **admin** | ✅ true | ✅ true | ✅ true | Can manage team |
| **member** | ❌ false | ❌ false | ✅ true | Can only post |
| **client** | ❌ false | ❌ false | ❌ false | View only |

---

## What Each Permission Does

### `can_manage_team`
- Invite new members
- Remove members
- Update member roles
- View pending invitations

### `can_manage_settings`
- Update workspace settings
- Change workspace name/logo
- Manage billing (future)

### `can_delete_posts`
- Delete any posts in the workspace
- Not just own posts

---

## Steps to Apply

### 1. Run the Migration

**Option A: Supabase SQL Editor (Recommended)**
```
1. Go to Supabase Dashboard
2. Click SQL Editor
3. Copy/paste from: migrations/add-workspace-permissions.sql
4. Click "Run"
```

**Option B: Supabase CLI**
```bash
cd social-api-demo
npx supabase db push
```

### 2. Restart Backend

```bash
cd functions
# Press Ctrl+C to stop
npm start
```

### 3. Test

1. Sign in as owner (`magebazappleid@gmail.com`)
2. Go to Team page
3. Try inviting a member
4. Should work now! ✅

---

## Verification Queries

### Check Your Permissions

```sql
-- See your own permissions
SELECT
  wm.role,
  wm.can_manage_team,
  wm.can_manage_settings,
  wm.can_delete_posts,
  up.email
FROM workspace_members wm
JOIN user_profiles up ON wm.user_id = up.id
WHERE up.email = 'magebazappleid@gmail.com';
```

### Check All Members

```sql
-- See all workspace members and their permissions
SELECT
  w.name as workspace_name,
  up.email,
  wm.role,
  wm.can_manage_team,
  wm.can_manage_settings,
  wm.can_delete_posts,
  wm.joined_at
FROM workspace_members wm
JOIN user_profiles up ON wm.user_id = up.id
JOIN workspaces w ON wm.workspace_id = w.id
ORDER BY w.name, wm.role, wm.joined_at;
```

### Summary by Role

```sql
-- Count members by role and permissions
SELECT
  role,
  COUNT(*) as member_count,
  COUNT(CASE WHEN can_manage_team THEN 1 END) as can_manage_team_count,
  COUNT(CASE WHEN can_manage_settings THEN 1 END) as can_manage_settings_count,
  COUNT(CASE WHEN can_delete_posts THEN 1 END) as can_delete_posts_count
FROM workspace_members
GROUP BY role
ORDER BY role;
```

---

## Future Workspace Creation

New workspaces will automatically set permissions because the backend migration code now includes:

```javascript
// functions/server.js line 2453-2463
const { error: memberError } = await supabase
  .from('workspace_members')
  .insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'owner',
    can_manage_team: true,        // ✅ Auto-set
    can_manage_settings: true,     // ✅ Auto-set
    can_delete_posts: true         // ✅ Auto-set
  });
```

---

## Column Defaults

The migration sets these defaults:

```sql
can_manage_team BOOLEAN DEFAULT false
can_manage_settings BOOLEAN DEFAULT false
can_delete_posts BOOLEAN DEFAULT true
```

**Why `can_delete_posts` defaults to `true`?**
- Most team members should be able to delete their own posts
- Can be restricted for client/view-only roles
- Owners/admins can override on a per-member basis

---

## Related Files

- [migrations/add-workspace-permissions.sql](migrations/add-workspace-permissions.sql) - Database migration
- [functions/server.js:1516-1607](functions/server.js#L1516-L1607) - Workspace endpoints
- [functions/server.js:2453-2463](functions/server.js#L2453-L2463) - Workspace creation
- [TEAM_WORKSPACE_FIX.md](TEAM_WORKSPACE_FIX.md) - Team system fix

---

## Status: ✅ Ready to Apply

Run the migration, restart backend, and test invitations!
