# Team Invitation Troubleshooting Guide

## Current Issue
Getting "failed to invite team member" error when trying to invite from the Team page.

## ✅ ROOT CAUSE FOUND

**The workspace_invitations table is missing the `status` column!**

The backend code tries to insert `status: 'pending'` but the column doesn't exist in the database schema.

**Solution:** Run this migration: [migrations/add-invitation-status.sql](migrations/add-invitation-status.sql)

---

## Step-by-Step Debugging

### Step 1: Verify Database Migration ✅

Run this query in Supabase SQL Editor: [migrations/verify-tables.sql](migrations/verify-tables.sql)

**Expected results:**
- `workspace_members` should have: `can_manage_team`, `can_manage_settings`, `can_delete_posts` columns
- `workspace_invitations` should have: `status` column
- Your account (magebazappleid@gmail.com) should have `role = 'owner'` and all permissions set to `true`

**If columns are missing:**
Run the migration: [migrations/add-workspace-permissions.sql](migrations/add-workspace-permissions.sql)

---

### Step 2: Check Backend Server Logs

The backend now logs detailed error information. Check your terminal where `npm start` is running.

**Look for:**
```
Database error creating invitation: [error details]
Error inviting member: [error details]
```

**Common errors:**

#### Error: "column 'status' does not exist"
**Solution:** The workspace_invitations table is missing the status column. Run this SQL:
```sql
ALTER TABLE workspace_invitations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
```

#### Error: "duplicate key violation"
**Solution:** An invitation or member already exists. Check with verify-tables.sql query #4

#### Error: "null value in column 'invited_by'"
**Solution:** The userId is not being passed correctly. Check browser console for the request payload.

---

### Step 3: Check Browser Console

Open Developer Tools (F12) → Console tab

**Look for:**
- Any red error messages
- Network tab → Find the failed request to `/api/workspaces/{id}/invite`
- Check the Response tab for detailed error message

**What to check:**
1. Request URL should include your workspace ID: `202c9c3e-fd81-4bec-ae09-4f9f008601bc`
2. Request payload should include:
   ```json
   {
     "email": "invited@example.com",
     "role": "member",
     "userId": "202c9c3e-fd81-4bec-ae09-4f9f008601bc"
   }
   ```
3. Response should show detailed error if it failed

---

### Step 4: Test Invitation Endpoint Directly

You can test the endpoint using curl or browser console:

**Using browser console (on the app page):**
```javascript
// Get your user from context
const user = JSON.parse(localStorage.getItem('user'));

// Test invite
fetch('http://localhost:3001/api/workspaces/202c9c3e-fd81-4bec-ae09-4f9f008601bc/invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'test@example.com',
    role: 'member',
    userId: user.id
  })
})
.then(r => r.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
```

---

### Step 5: Verify Backend Code is Running

The backend server is running (checked via netstat), but let's make sure the latest code is loaded.

**Restart the backend:**
```bash
cd social-api-demo/functions
# Press Ctrl+C to stop
npm start
```

**Check the startup logs for:**
- No error messages
- Server listening on port 3001
- Supabase connection successful

---

## Common Solutions

### Solution 1: Missing Status Column
```sql
-- Add status column to workspace_invitations
ALTER TABLE workspace_invitations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';

-- Verify it was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'workspace_invitations'
AND column_name = 'status';
```

### Solution 2: Missing Permission Columns
Run: [migrations/add-workspace-permissions.sql](migrations/add-workspace-permissions.sql)

### Solution 3: Invalid Workspace ID
Make sure you're using the correct workspace ID. Your workspace ID is:
```
202c9c3e-fd81-4bec-ae09-4f9f008601bc
```

Check in browser console:
```javascript
const { activeWorkspace } = useWorkspace();
console.log('Active Workspace:', activeWorkspace);
```

---

## Expected Flow (When Working)

1. **User clicks "Invite Team Member"** on Team page
2. **Frontend calls:** `POST /api/workspaces/202c9c3e-fd81-4bec-ae09-4f9f008601bc/invite`
3. **Backend checks:**
   - User has permission (owner/admin/can_manage_team)
   - Email not already invited (status = 'pending')
   - Email not already a member
4. **Backend creates invitation** in workspace_invitations table with status = 'pending'
5. **Backend logs invitation URL** in terminal
6. **Frontend shows success** message and refreshes pending invites list

---

## Files to Check

- [server.js:1516-1607](functions/server.js#L1516-L1607) - Workspace invite endpoints
- [TeamContent.jsx:64-108](src/components/TeamContent.jsx#L64-L108) - Frontend invite logic
- [migrations/add-workspace-permissions.sql](migrations/add-workspace-permissions.sql) - Permission columns
- [migrations/verify-tables.sql](migrations/verify-tables.sql) - Verification queries

---

## Next Steps

1. ✅ Run verify-tables.sql in Supabase SQL Editor
2. ✅ Check backend terminal logs
3. ✅ Check browser console Network tab
4. ✅ Report back with the specific error message

Once we see the actual error message, we can fix the root cause!
