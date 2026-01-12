# Team Management Implementation Roadmap

## Overview
Build a complete team management system where users can invite team members, assign roles, and manage permissions.

---

## Current State Analysis

### ✅ What We Have:
- **Database**: `team_members` table exists with columns:
  - `id`, `owner_id`, `member_id`, `role`, `created_at`
  - Supports roles: 'admin', 'editor'
- **UI**: Basic TeamContent component with placeholder data
- **CSS**: Basic styling (needs redesign to match brand)

### ❌ What's Missing:
- Team invitations system (email invites)
- Invite status tracking (pending/accepted/rejected)
- Role management (view-only role)
- Remove member functionality
- Resend invite functionality
- Email notification system
- Integration with Supabase Auth

---

## Phase 1: Database Schema Updates
**Goal**: Extend database to support invite system and new role

### Tasks:
1. **Create `team_invitations` table**
   ```sql
   CREATE TABLE team_invitations (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
     email TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'editor', -- 'admin', 'editor', 'view_only'
     status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
     invite_token UUID DEFAULT uuid_generate_v4(),
     invited_at TIMESTAMPTZ DEFAULT NOW(),
     expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
     accepted_at TIMESTAMPTZ,
     UNIQUE(owner_id, email)
   );
   ```

2. **Update `team_members` table**
   - Add `role` support for 'view_only'
   - Add `invited_by` column to track who invited them
   - Add `joined_at` timestamp

3. **Add `user_profiles` columns**
   - `email_notifications` (already exists)
   - `weekly_summaries` (already exists)
   - `team_activity_alerts` (already exists)

4. **Create RLS policies**
   - Users can view invitations sent to their email
   - Users can view invitations they sent
   - Only owner can delete/update invitations

### Deliverables:
- ✅ Migration file: `migrations/team-management-schema.sql`
- ✅ RLS policies configured
- ✅ Test data inserted

**Time Estimate**: 1 hour

---

## Phase 2: UI Redesign (Match Brand Colors)
**Goal**: Make Team page match Settings page design

### Tasks:
1. **Update TeamContent.css**
   - Change colors to brand palette:
     - Teal: `#114C5A`
     - Yellow: `#FFC801`
     - Light: `#F1F6F4`
   - Update buttons to use yellow with teal text
   - Add border styling: `2px solid rgba(0, 0, 0, 0.4)`
   - Match section styling from Settings

2. **Update component structure**
   - Use same section layout as Settings
   - Add proper spacing and padding (40px containers)
   - Add hover effects matching Settings

### Deliverables:
- ✅ Updated `TeamContent.css` matching brand
- ✅ Consistent styling across Settings and Team pages

**Time Estimate**: 30 minutes

---

## Phase 3: Invite Team Member Modal
**Goal**: Build modal UI for inviting new members

### Tasks:
1. **Create `InviteMemberModal` component**
   - Email input field (with validation)
   - Role selector dropdown:
     - Admin (full access)
     - Editor (can create/edit posts)
     - View Only (read-only access)
   - Role descriptions/tooltips
   - Cancel/Send Invite buttons

2. **Add validation**
   - Email format validation
   - Check if email already invited
   - Check if email already a team member
   - Check if user is inviting themselves

3. **Styling**
   - Match modal styling from Schedule page
   - Use brand colors
   - Mobile responsive

### Deliverables:
- ✅ `InviteMemberModal.jsx` component
- ✅ Form validation working
- ✅ Styled to match brand

**Time Estimate**: 1.5 hours

---

## Phase 4: Backend API - Send Invitations
**Goal**: Create API endpoint to send team invitations

### Tasks:
1. **Create `/api/team/invite` endpoint in server.js**
   - Validate request (owner_id, email, role)
   - Check if email already invited or is member
   - Generate unique invite token
   - Insert into `team_invitations` table
   - Send invitation email via Supabase Auth or email service

2. **Email template**
   - Create HTML email template
   - Include:
     - Inviter's name
     - Role being assigned
     - Accept invite button/link
     - Expiration notice (7 days)
   - Link format: `/accept-invite?token=xxx`

3. **Error handling**
   - Email already invited
   - Email already a member
   - Invalid email format
   - User not found

### Deliverables:
- ✅ `/api/team/invite` endpoint
- ✅ Email template created
- ✅ Error handling implemented

**Time Estimate**: 2 hours

---

## Phase 5: Accept Invite Flow
**Goal**: Allow invited users to accept invitations

### Tasks:
1. **Create `/accept-invite` page**
   - Extract token from URL
   - Validate token (exists, not expired, status=pending)
   - Show invitation details:
     - Who invited them
     - Role being assigned
     - Expiration date
   - Accept/Decline buttons

2. **Create `/api/team/accept-invite` endpoint**
   - Verify token is valid
   - Check if user is authenticated
   - If not authenticated, prompt to sign up/login
   - Create `team_members` record
   - Update invitation status to 'accepted'
   - Send confirmation email

3. **Handle edge cases**
   - Expired invitations
   - Already accepted invitations
   - Invalid tokens
   - User already a member

### Deliverables:
- ✅ Accept invite page
- ✅ `/api/team/accept-invite` endpoint
- ✅ Edge cases handled

**Time Estimate**: 2.5 hours

---

## Phase 6: Team Members List (Frontend)
**Goal**: Display all team members with status

### Tasks:
1. **Fetch team members from Supabase**
   - Query `team_members` table
   - Join with `user_profiles` to get names
   - Show current user's team

2. **Fetch pending invitations**
   - Query `team_invitations` table
   - Filter by status='pending'
   - Show with different styling

3. **Update TeamContent.jsx**
   - Display active members with:
     - Avatar (initials or photo)
     - Name
     - Email
     - Role badge (color-coded)
     - Actions (Change Role, Remove)
   - Display pending invitations with:
     - Email
     - Role
     - "Pending" status badge
     - Actions (Resend Invite, Cancel Invite)

4. **Add visual indicators**
   - ✅ Green checkmark for accepted members
   - ⏳ Pending icon for invitations
   - 📧 Resend email icon

### Deliverables:
- ✅ Team members list functional
- ✅ Pending invitations displayed
- ✅ Status indicators showing

**Time Estimate**: 2 hours

---

## Phase 7: Role Management
**Goal**: Allow changing member roles

### Tasks:
1. **Create `/api/team/update-role` endpoint**
   - Validate user is owner or admin
   - Update role in `team_members` table
   - Send notification email to member

2. **Add role change UI**
   - Dropdown in member card
   - Only show for owner/admins
   - Confirm dialog before changing
   - Disable for current user (can't change own role)

3. **Role permissions enforcement**
   - Define what each role can do:
     - **Admin**: Full access (invite, remove, change roles, create/edit/delete posts)
     - **Editor**: Create/edit/delete posts, view team
     - **View Only**: View posts and team only (no editing)
   - Add permission checks throughout app

### Deliverables:
- ✅ Role change functionality
- ✅ `/api/team/update-role` endpoint
- ✅ Permission checks added

**Time Estimate**: 2 hours

---

## Phase 8: Remove Team Member
**Goal**: Allow removing team members

### Tasks:
1. **Create `/api/team/remove-member` endpoint**
   - Validate user is owner or admin
   - Cannot remove yourself
   - Delete from `team_members` table
   - Send notification email to removed member

2. **Add confirmation dialog**
   - "Are you sure?" modal
   - Show member name and role
   - Explain consequences (lose access)
   - Cancel/Remove buttons

3. **Update UI after removal**
   - Remove member card from list
   - Show success message
   - Refresh team list

### Deliverables:
- ✅ Remove member functionality
- ✅ Confirmation dialog
- ✅ `/api/team/remove-member` endpoint

**Time Estimate**: 1.5 hours

---

## Phase 9: Resend Invitation
**Goal**: Resend invitation emails

### Tasks:
1. **Create `/api/team/resend-invite` endpoint**
   - Verify invitation exists and is pending
   - Check not expired (if expired, extend expiration)
   - Resend invitation email
   - Update `invited_at` timestamp

2. **Add resend button to UI**
   - Mail icon next to pending invitations
   - Show "Resent!" confirmation
   - Disable temporarily after sending

### Deliverables:
- ✅ Resend invite button working
- ✅ `/api/team/resend-invite` endpoint

**Time Estimate**: 1 hour

---

## Phase 10: Cancel Invitation
**Goal**: Allow canceling pending invitations

### Tasks:
1. **Create `/api/team/cancel-invite` endpoint**
   - Update invitation status to 'cancelled'
   - Or delete from `team_invitations` table
   - No email needed

2. **Add cancel button to UI**
   - Show next to pending invitations
   - Confirmation dialog
   - Remove from list after canceling

### Deliverables:
- ✅ Cancel invite functionality
- ✅ `/api/team/cancel-invite` endpoint

**Time Estimate**: 45 minutes

---

## Phase 11: Email Notification System
**Goal**: Set up email sending infrastructure

### Tasks:
1. **Choose email service**
   - Option 1: Supabase Auth emails (limited)
   - Option 2: SendGrid
   - Option 3: Resend.com
   - Option 4: AWS SES

2. **Set up email templates**
   - Invitation email
   - Acceptance confirmation
   - Role changed notification
   - Removed from team notification

3. **Configure environment variables**
   - Email service API key
   - From email address
   - Template IDs

### Deliverables:
- ✅ Email service configured
- ✅ All templates created
- ✅ Test emails sending

**Time Estimate**: 2 hours

---

## Phase 12: Permission Enforcement
**Goal**: Restrict actions based on roles throughout app

### Tasks:
1. **Create permission utility**
   ```javascript
   // utils/permissions.js
   export const hasPermission = (user, action) => {
     // Check role and return true/false
   };
   ```

2. **Add permission checks**
   - Compose page: Only admin/editor can create posts
   - Schedule page: Only admin/editor can edit/delete
   - Posts page: Only admin/editor can modify
   - Team page: Only admin can invite/remove
   - Settings: Only user can edit own settings

3. **UI updates**
   - Hide buttons for actions user can't perform
   - Show "No permission" message when needed
   - Disable features for view-only users

### Deliverables:
- ✅ Permission system working
- ✅ UI respects permissions
- ✅ API endpoints validate permissions

**Time Estimate**: 2.5 hours

---

## Phase 13: Testing & Polish
**Goal**: Test all functionality and fix bugs

### Tasks:
1. **Test invite flow**
   - Send invitations
   - Accept invitations
   - Decline invitations
   - Expired invitations

2. **Test role management**
   - Change roles
   - Verify permissions
   - Test edge cases

3. **Test removal**
   - Remove members
   - Cancel invitations
   - Resend invitations

4. **UI polish**
   - Loading states
   - Error messages
   - Empty states
   - Mobile responsiveness

5. **Security audit**
   - Verify RLS policies
   - Test unauthorized access
   - Check API validation

### Deliverables:
- ✅ All features tested
- ✅ Bugs fixed
- ✅ Security verified

**Time Estimate**: 3 hours

---

## Total Estimated Time: ~23 hours

---

## Implementation Order (Recommended):

1. **Phase 1**: Database Schema (Foundation)
2. **Phase 2**: UI Redesign (Quick win, visual progress)
3. **Phase 3**: Invite Modal (User-facing feature)
4. **Phase 4**: Send Invitations Backend (Core functionality)
5. **Phase 11**: Email Setup (Required for Phase 4 to work)
6. **Phase 5**: Accept Invite Flow (Complete invite cycle)
7. **Phase 6**: Team List Frontend (Show results)
8. **Phase 7**: Role Management (Enhancement)
9. **Phase 8**: Remove Member (Core feature)
10. **Phase 9**: Resend Invite (Nice-to-have)
11. **Phase 10**: Cancel Invite (Nice-to-have)
12. **Phase 12**: Permission Enforcement (Security)
13. **Phase 13**: Testing & Polish (Quality)

---

## Notes:
- Each phase builds on previous phases
- Can be done incrementally
- Test after each phase
- Some phases can be done in parallel (e.g., Phase 2 + Phase 3)
