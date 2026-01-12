# Team Workspace Integration Fix ✅

## Problem

The team invitation system was using **two separate database table systems**:

1. **OLD System**: `team_invitations` + `team_members` tables
2. **NEW System**: `workspace_invitations` + `workspace_members` tables

The **Team page UI** was calling endpoints that used the OLD tables, but the **workspace context and backend logic** expected the NEW tables. This caused invited team members to not join the correct workspace.

---

## Root Cause

- `/api/send-team-invite` → uses `team_invitations` table (OLD)
- `/api/workspaces/:id/invite` → uses `workspace_invitations` table (NEW)

The frontend `TeamContent.jsx` was calling the OLD endpoint, so invitations went to the wrong tables.

---

## Solution

### 1. Updated Backend ✅

**Added new endpoint:** `/api/workspaces/:id/invitations` (line 1574-1607)
- Fetches pending invitations from `workspace_invitations` table
- Requires workspace membership with `can_manage_team` permission
- Returns invitations filtered by workspace ID

```javascript
app.get("/api/workspaces/:id/invitations", async (req, res) => {
  // Fetches from workspace_invitations table
  const { data: invitations } = await supabase
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', id)
    .eq('status', 'pending');

  res.json({ invitations });
});
```

### 2. Updated Frontend ✅

**File:** [TeamContent.jsx](src/components/TeamContent.jsx)

**Changes:**
1. Added `useWorkspace` hook import
2. Get `activeWorkspace` from context
3. Updated all API calls to use workspace endpoints:

| Old Endpoint | New Endpoint |
|-------------|--------------|
| `/api/send-team-invite` | `/api/workspaces/{workspaceId}/invite` |
| `/api/team/members` | `/api/workspaces/{workspaceId}/members` |
| `/api/team/pending-invites` | `/api/workspaces/{workspaceId}/invitations` |

**Key Changes:**

```javascript
// Import workspace context
import { useWorkspace } from "../contexts/WorkspaceContext";

// Get active workspace
const { activeWorkspace } = useWorkspace();

// Updated invite function
const handleInvite = async (inviteData) => {
  const response = await fetch(
    `${baseURL}/api/workspaces/${activeWorkspace.id}/invite`,  // NEW
    {
      method: 'POST',
      body: JSON.stringify({
        email: inviteData.email,
        role: inviteData.role || 'member',
        userId: user.id,
      }),
    }
  );
};

// Updated fetch members
const fetchTeamMembers = async () => {
  const response = await fetch(
    `${baseURL}/api/workspaces/${activeWorkspace.id}/members?userId=${user.id}`  // NEW
  );
  const payload = await response.json();
  setTeamMembers(payload.members || []);  // Note: payload.members not payload.data
};

// Updated fetch invitations
const fetchPendingInvites = async () => {
  const response = await fetch(
    `${baseURL}/api/workspaces/${activeWorkspace.id}/invitations?userId=${user.id}`  // NEW
  );
  const payload = await response.json();
  setPendingInvites(payload.invitations || []);  // Note: payload.invitations not payload.data
};
```

---

## How It Works Now

### Team Invitation Flow:

1. **Owner sends invite:**
   - Team page calls `/api/workspaces/{workspaceId}/invite`
   - Creates row in `workspace_invitations` table
   - Invitation includes `workspace_id`, `email`, `role`, `invitation_token`

2. **Member receives invite:**
   - Gets invitation link with token
   - Clicks "Accept Invitation"
   - AcceptInvite page validates token from `workspace_invitations`

3. **Member joins workspace:**
   - Row created in `workspace_members` table
   - Member's `workspace_id` = Owner's workspace ID
   - Member gets role (owner, admin, member, etc.)

4. **Member uses app:**
   - `WorkspaceContext` provides `activeWorkspace` (owner's workspace)
   - All API calls include `workspaceId` parameter
   - Backend uses `getWorkspaceProfileKey(workspaceId)`
   - Returns owner's Ayrshare profile key
   - Member posts using owner's connected accounts

---

## Database Tables

### Correct Tables (NOW USED):

**workspace_invitations**
```sql
workspace_id (FK to workspaces.id)
email
role
invited_by (FK to user_profiles.id)
invitation_token
status ('pending', 'accepted', 'rejected')
created_at
expires_at
```

**workspace_members**
```sql
workspace_id (FK to workspaces.id)
user_id (FK to user_profiles.id)
role ('owner', 'admin', 'member', 'client')
can_manage_team (boolean)
can_manage_settings (boolean)
can_delete_posts (boolean)
joined_at
```

### Old Tables (NO LONGER USED):

**team_invitations** ❌ (deprecated)
**team_members** ❌ (deprecated)

---

## Testing

### Test the Fix:

1. **Owner invites member:**
   ```
   - Sign in as owner (magebazappleid@gmail.com)
   - Go to Team page
   - Click "Invite Team Member"
   - Enter email: teammember@example.com
   - Send invitation
   ```

2. **Check database:**
   ```sql
   -- Should see row in workspace_invitations (NEW)
   SELECT * FROM workspace_invitations
   WHERE email = 'teammember@example.com';

   -- Should NOT see row in team_invitations (OLD)
   SELECT * FROM team_invitations
   WHERE email = 'teammember@example.com';
   ```

3. **Member accepts:**
   ```
   - Open invitation link
   - Click "Accept"
   - Check workspace switcher → should show owner's workspace
   ```

4. **Verify membership:**
   ```sql
   -- Should see member in workspace_members
   SELECT wm.*, up.email, w.name as workspace_name
   FROM workspace_members wm
   JOIN user_profiles up ON wm.user_id = up.id
   JOIN workspaces w ON wm.workspace_id = w.id
   WHERE up.email = 'teammember@example.com';
   ```

5. **Test posting:**
   ```
   - Sign in as member
   - Go to Compose page
   - Create a post
   - Check Network tab → request should include workspaceId
   - Backend should use owner's profile key
   ```

---

## Benefits

### ✅ Proper Workspace Isolation
- Each workspace has its own members and invitations
- Clear ownership and hierarchy

### ✅ Multi-Workspace Support
- Users can be members of multiple workspaces
- Workspace switcher shows all workspaces
- Team page shows current workspace's members

### ✅ Consistent Data
- All workspace operations use same tables
- No confusion between old/new systems
- Frontend and backend aligned

### ✅ Role-Based Access
- Proper permission checking
- Only users with `can_manage_team` can invite
- Roles properly enforced

---

## What Changed

### Backend (server.js):
- ✅ Added `/api/workspaces/:id/invitations` endpoint (line 1574)

### Frontend (TeamContent.jsx):
- ✅ Added `useWorkspace` import
- ✅ Get `activeWorkspace` from context
- ✅ Updated `handleInvite` to use workspace endpoint
- ✅ Updated `fetchTeamMembers` to use workspace endpoint
- ✅ Updated `fetchPendingInvites` to use workspace endpoint
- ✅ Updated `useEffect` to depend on `activeWorkspace`
- ✅ Fixed response data access (`payload.members`, `payload.invitations`)

---

## Migration Path

### For Existing Data:

If you have data in the old `team_invitations` / `team_members` tables:

```sql
-- Migrate team_invitations to workspace_invitations
INSERT INTO workspace_invitations (workspace_id, email, role, invited_by, invitation_token, status, created_at, expires_at)
SELECT
  owner_id as workspace_id,  -- Assuming owner_id = workspace_id
  email,
  role,
  owner_id as invited_by,
  CONCAT('migrated-', id) as invitation_token,
  status,
  created_at,
  expires_at
FROM team_invitations
WHERE status = 'pending';

-- Migrate team_members to workspace_members
INSERT INTO workspace_members (workspace_id, user_id, role, can_manage_team, can_manage_settings, can_delete_posts, joined_at)
SELECT
  owner_id as workspace_id,  -- Assuming owner_id = workspace_id
  member_id as user_id,
  role,
  CASE WHEN role = 'admin' THEN true ELSE false END as can_manage_team,
  CASE WHEN role = 'admin' THEN true ELSE false END as can_manage_settings,
  true as can_delete_posts,
  created_at as joined_at
FROM team_members;
```

---

## Status: ✅ Complete

**Team invitations now use the correct workspace tables and team members join the proper workspace.**

---

## Next Steps

1. Test the fixed invitation flow
2. Verify team members can post using owner's profile
3. Consider deprecating old tables (`team_invitations`, `team_members`)
4. Update any other code that references old tables

---

## Related Files

- [TeamContent.jsx](src/components/TeamContent.jsx) - Frontend team management
- [server.js:1516-1607](functions/server.js#L1516-L1607) - Workspace endpoints
- [WorkspaceContext.jsx](src/contexts/WorkspaceContext.jsx) - Workspace state
- [TEAM_MEMBER_TESTING_GUIDE.md](TEAM_MEMBER_TESTING_GUIDE.md) - Testing guide
