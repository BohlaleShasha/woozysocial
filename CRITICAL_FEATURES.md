# CRITICAL FEATURES - DO NOT MODIFY WITHOUT TESTING

This document lists critical features that are core to the application. Any changes to these features MUST be tested thoroughly before deployment.

## 1. Social Account Connection (CRITICAL - DO NOT BREAK)

### Why This Is Critical
The social account connection feature is the foundation of the entire application. Without it, users cannot:
- Connect their social media accounts
- Post to any platforms
- Use any core functionality

### API Endpoint
**File:** `api/generate-jwt.js`
**Response Format:**
```javascript
{
  success: true,
  data: {
    url: "https://app.ayrshare.com/..." // Ayrshare JWT URL
  }
}
```

### Frontend Components That Use This Feature
1. **SocialAccounts.jsx** (line 121-129)
   - Primary social accounts management page
   - ✅ Correctly handles response: `const url = d.data?.url || d.url;`

2. **TopHeader.jsx** (line 77-80)
   - Connect social accounts from header dropdown
   - ✅ Correctly handles response: `const url = d.data?.url || d.url;`

3. **DashboardContent.jsx** (line 94-121)
   - Connect from dashboard quick actions
   - ✅ Correctly handles response: `const url = data.data?.url || data.url;`
   - ✅ Correctly uses `url` variable in popup blocked fallback

4. **RightSideNav.jsx** (line 103-114)
   - Connect from right sidebar
   - ✅ Correctly handles response: `const url = data.data?.url || data.url;`

### Common Mistakes to Avoid
❌ **WRONG:** `const data = await res.json(); window.open(data.url, ...)`
✅ **CORRECT:** `const data = await res.json(); const url = data.data?.url || data.url; window.open(url, ...)`

### API Response Structure Pattern
All API endpoints using `sendSuccess()` from `api/_utils.js` return:
```javascript
{
  success: true,
  data: {
    // actual response data here
  }
}
```

Therefore, frontend must always access nested data:
- `response.data.url` NOT `response.url`
- `response.data.accounts` NOT `response.accounts`
- `response.data.invitation` NOT `response.invitation`

### Testing Checklist
Before deploying changes that touch social account connection:
- [ ] Test from SocialAccounts page
- [ ] Test from TopHeader dropdown
- [ ] Test from Dashboard
- [ ] Test from RightSideNav
- [ ] Test popup blocked scenario
- [ ] Verify JWT URL is properly extracted
- [ ] Check browser console for errors

### Related Files
- `api/generate-jwt.js` - JWT generation endpoint
- `api/_utils.js` - sendSuccess/sendError helpers
- `src/components/SocialAccounts.jsx`
- `src/components/layout/TopHeader.jsx`
- `src/components/DashboardContent.jsx`
- `src/components/RightSideNav.jsx`

### Environment Variables Required
- `AYRSHARE_API_KEY` - Ayrshare API key
- `AYRSHARE_DOMAIN` - Your Ayrshare domain
- `AYRSHARE_PRIVATE_KEY` - Ayrshare private key (RSA format with \n escaped)
- `AYRSHARE_PROFILE_KEY` - Default profile key (fallback)

---

## 2. Teams & Invitation System (CRITICAL - DO NOT BREAK)

⚠️ **EXTREMELY CRITICAL** ⚠️ - This system took extensive debugging to get working correctly. DO NOT modify without explicit approval and thorough testing.

### Why This Is Critical
The Teams/Invitation system is essential for workspace collaboration:
- Allows inviting team members and clients to workspaces
- Manages role-based permissions (owner, admin, editor, client, view_only)
- Controls who can approve posts, manage team, etc.
- **Breaking this breaks the entire multi-user workflow**

### Database Schema Requirements
The `workspace_members` table MUST have these columns:
```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'view_only', 'client')),
  can_manage_team BOOLEAN DEFAULT false,
  can_manage_settings BOOLEAN DEFAULT false,
  can_delete_posts BOOLEAN DEFAULT false,
  can_approve_posts BOOLEAN DEFAULT false,  -- CRITICAL: Must exist or invitations will fail!
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);
```

### RLS Policies (MUST BE CORRECT)
**Critical RLS Policy** - Without this, invitations will fail silently:
```sql
CREATE POLICY "Allow service role full access"
ON workspace_members
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Environment Variables Required
- `APP_URL` - MUST be frontend domain (https://woozysocial.com) NOT API domain
- `RESEND_API_KEY` - For sending invitation emails
- `SUPABASE_URL` - Database connection
- `SUPABASE_SERVICE_ROLE_KEY` - Required for RLS bypass

---

## 3. Invitation System Flow (DO NOT MODIFY)

### Why This Is Critical
Team collaboration depends on invitations working correctly.

### Complete Invitation Flow (All Steps Required)

**Step 1: Create Invitation**
```
POST /api/invitations/create
Body: { workspaceId, email, role, userId }
→ Creates workspace_invitations record
→ Sends email with link: APP_URL/accept-invite?token=xxx
→ Email MUST be sent to exact address
```

**Step 2: Validate Token**
```
GET /api/invitations/validate?token=xxx
→ Checks invitation exists, not expired, status=pending
→ Returns invitation details
```

**Step 3: Accept Invitation**
```
POST /api/invitations/accept
Body: { token, userId }
→ Validates logged-in email EXACTLY matches invitation email
→ Inserts into workspace_members (requires RLS policy!)
→ Sets can_approve_posts based on role
→ Updates invitation status to 'accepted'
```

### Critical Files (DO NOT MODIFY)
**API Endpoints:**
- `api/invitations/create.js` - Creates invitations, sends emails
- `api/invitations/validate.js` - Validates invitation tokens
- `api/invitations/accept.js` - **MOST CRITICAL** - Adds member to workspace
- `api/invitations/cancel.js` - Cancels pending invitations
- `api/invitations/leave.js` - Allows members to leave workspace
- `api/invitations/list.js` - Lists pending invitations

**Frontend Components:**
- `src/pages/AcceptInvite.jsx` - Invitation acceptance UI
- `src/components/TeamContent.jsx` - Team management dashboard
- `src/components/InviteMemberModal.jsx` - Modal for creating invitations

### Common Issues That Were Fixed (DO NOT REINTRODUCE)
1. ❌ **APP_URL pointing to API domain** - Must be frontend domain (woozysocial.com)
2. ❌ **Missing can_approve_posts column** - Must exist in workspace_members table
3. ❌ **RLS blocking inserts** - Must have service_role policy
4. ❌ **Email mismatch** - Logged-in email must exactly match invitation email
5. ❌ **Wrong response parsing** - Must use `result.data?.invitation` not `result.invitation`

### Response Structure
All invitation endpoints return:
```javascript
{
  success: true,
  data: {
    invitation: { ... },
    // or
    invitations: [ ... ]
  }
}
```

### Frontend Components
- `src/pages/AcceptInvite.jsx` - Invitation acceptance page
- `src/components/TeamContent.jsx` - Team management

### Environment Variables
- `APP_URL` - Frontend URL (e.g., https://api.woozysocial.com)
- `RESEND_API_KEY` - Email service API key

### Testing Checklist
- [ ] Create invitation sends email
- [ ] Accept invitation works with correct email
- [ ] Cancel invitation removes from database
- [ ] Leave workspace works (except for owners)
- [ ] Email contains correct invite link with APP_URL

---

## General Rules for API Consumption

### Always Use This Pattern:
```javascript
const response = await fetch('/api/endpoint');
const json = await response.json();

// For single items
const item = json.data?.item || json.item;

// For arrays
const items = json.data?.items || json.items || [];

// For nested objects
const nestedData = json.data?.nested?.value || json.nested?.value;
```

### Never Assume Flat Response Structure
❌ `const { url } = await response.json()`
✅ `const json = await response.json(); const url = json.data?.url || json.url;`

---

*Last Updated: January 13, 2026*
*Maintained by: Development Team*
