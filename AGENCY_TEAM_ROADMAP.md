# Agency Team Management - Implementation Roadmap

## Overview
This feature enables agency subscription users to maintain a central team roster and efficiently provision team members across multiple client workspaces, eliminating the need to manually invite the same team members to each workspace.

**Problem Solved**: Currently, agencies must manually invite their core team (5+ members) to every client workspace (10-20+ workspaces) = 50-100+ invitations. This feature reduces this to: define team once, click checkboxes per workspace.

**Business Value**:
- Time savings: 30+ minutes → 2 minutes to provision team across 10 workspaces
- Better UX for agency users (primary customer segment)
- Competitive advantage in agency management features

---

## Quick Start Implementation

### Prerequisites
- Supabase database access
- Node.js environment for API development
- React development environment
- Access to modify migrations, API endpoints, and frontend components

### Estimated Timeline
- **Database & API**: 3-4 days
- **Frontend**: 3-4 days
- **Testing & Polish**: 2-3 days
- **Total**: ~8-11 days for complete implementation

---

## Phase-by-Phase Roadmap

### Phase 1: Database Foundation (Days 1-2)

**Goal**: Create database schema and security policies

**Tasks**:
1. Create migration file: `migrations/009_agency_team_management.sql`
2. Add `agency_team_members` table
   - Stores agency owner's team roster
   - Fields: agency_owner_id, email, member_user_id, default_role, status, etc.
3. Add `agency_workspace_provisions` table
   - Audit trail of team provisioning
   - Fields: agency_team_member_id, workspace_id, provisioned_by, role_assigned
4. Create indexes for performance
5. Add RLS policies (only agency tier users can access)
6. Test migration runs successfully

**Files to Create**:
- `migrations/009_agency_team_management.sql`

**Validation**:
- [ ] Migration runs without errors
- [ ] Tables created with correct schema
- [ ] Indexes exist
- [ ] RLS policies prevent unauthorized access
- [ ] Can manually insert test data via SQL

---

### Phase 2: Core API - Team Roster Management (Days 2-3)

**Goal**: CRUD operations for agency team roster

**Tasks**:
1. `GET /api/agency-team/list` - Fetch team roster
   - Requires agency tier subscription
   - Returns all team members for agency owner

2. `POST /api/agency-team/add` - Add member to roster
   - Validates email format
   - Checks for duplicates
   - Optionally sends invitation email if user not registered

3. `POST /api/agency-team/update` - Update member details
   - Edit name, default role, notes

4. `POST /api/agency-team/remove` - Remove from roster
   - Option to also remove from all workspaces
   - Confirmation required

**Files to Create**:
- `api/agency-team/list.js`
- `api/agency-team/add.js`
- `api/agency-team/update.js`
- `api/agency-team/remove.js`

**Validation**:
- [ ] Endpoints require authentication
- [ ] Subscription tier checked (agency only)
- [ ] Email validation works
- [ ] Duplicate prevention works
- [ ] Test with Postman/Insomnia

---

### Phase 3: Bulk Provisioning API (Day 3-4)

**Goal**: Add selected team members to workspace in bulk

**Tasks**:
1. `POST /api/agency-team/bulk-provision` - Core provisioning logic
   - Accepts: workspaceId, teamMemberIds[], roleOverrides{}
   - For registered users: Add directly to workspace_members
   - For unregistered users: Create workspace_invitations
   - Create provision records in agency_workspace_provisions
   - Send notifications/emails

2. Modify `POST /api/workspace/create`
   - After workspace creation, check if user is agency tier
   - If yes, fetch and return agency team roster
   - Frontend will use this to show provision modal

**Files to Create**:
- `api/agency-team/bulk-provision.js`

**Files to Modify**:
- `api/workspace/create.js` (add ~15 lines at end)

**Validation**:
- [ ] Registered users added directly to workspace_members
- [ ] Unregistered users create invitations
- [ ] Provision records created
- [ ] Notifications sent
- [ ] Handles "already a member" gracefully
- [ ] Role overrides work correctly

---

### Phase 4: Frontend - Agency Team Management Page (Days 5-6)

**Goal**: UI for managing agency team roster

**Tasks**:
1. Create `AgencyTeamPage.jsx`
   - Table/list view of team members
   - Shows: name, email, status, default role, # of workspaces
   - Add/Edit/Remove actions
   - Search/filter functionality

2. Create `AddAgencyTeamMemberModal.jsx`
   - Form: email, name, default role, notes
   - Email validation
   - "Send invitation" checkbox

3. Add route `/agency-team`
   - Protected route (agency tier only)
   - Add to navigation sidebar

4. Add subscription gate
   - Show upgrade prompt for non-agency users
   - Check tier in AuthContext

**Files to Create**:
- `src/pages/AgencyTeamPage.jsx`
- `src/components/agency/AddAgencyTeamMemberModal.jsx`

**Files to Modify**:
- `src/App.jsx` or routing config (add route)
- `src/components/Sidebar.jsx` or navigation (add link)

**Design Notes**:
- Match existing design system (colors, fonts, spacing)
- Use existing button/modal components
- Table should be responsive

**Validation**:
- [ ] Page accessible for agency users only
- [ ] Add team member form works
- [ ] Edit member updates correctly
- [ ] Remove member deletes from roster
- [ ] List displays correctly
- [ ] Search/filter works

---

### Phase 5: Frontend - Workspace Provisioning Modal (Days 6-7)

**Goal**: Modal to select team members after workspace creation

**Tasks**:
1. Create `WorkspaceTeamProvisionModal.jsx`
   - Checkbox list of team members
   - Show: name, email, default role
   - Role override dropdown per member
   - "Select All" / "Deselect All" buttons
   - "Skip" button (close without provisioning)
   - "Add X Selected Members" button
   - Loading state during bulk provision
   - Success/error feedback

2. Modify `CreateWorkspaceModal.jsx`
   - After workspace created, check if response includes team members
   - If yes, show provision modal
   - Pass workspace info and team roster to modal

3. Integrate with bulk provision API
   - Call `/api/agency-team/bulk-provision`
   - Handle success/error states
   - Show results summary

**Files to Create**:
- `src/components/workspace/WorkspaceTeamProvisionModal.jsx`

**Files to Modify**:
- `src/components/workspace/CreateWorkspaceModal.jsx` (add ~30 lines)

**UX Flow**:
```
Create Workspace button clicked
  ↓
Create Workspace Modal opens
  ↓
User enters workspace name, clicks Create
  ↓
API creates workspace
  ↓
For agency users: Provision modal appears automatically
  ↓
User selects team members (with role overrides)
  ↓
Click "Add Selected Members"
  ↓
Bulk provision API called
  ↓
Show success message with summary
  ↓
Redirect to new workspace
```

**Validation**:
- [ ] Modal appears after workspace creation (agency only)
- [ ] Team members list displayed
- [ ] Checkboxes work
- [ ] Role override dropdowns work
- [ ] Skip button closes modal
- [ ] Bulk provision works
- [ ] Success message shows correct counts
- [ ] Errors handled gracefully

---

### Phase 6: Notifications & Polish (Day 8)

**Goal**: Complete user experience with notifications and error handling

**Tasks**:
1. Add notification types
   - `agency_team_added` - Added to agency roster
   - `workspace_provisioned` - Added to workspace via bulk provision

2. Integrate notification creation in APIs
   - Modify bulk-provision endpoint to create notifications
   - Send emails for invitations

3. Add confirmation dialogs
   - "Remove from roster?" confirmation
   - "Also remove from X workspaces?" option
   - "Remove member from workspace?" confirmation

4. Error handling polish
   - User-friendly error messages
   - Loading states on all actions
   - Network error handling

5. UI polish
   - Consistent styling
   - Proper spacing and alignment
   - Mobile responsiveness
   - Accessibility (keyboard navigation, ARIA labels)

**Files to Modify**:
- `api/agency-team/bulk-provision.js` (add notification creation)
- All agency-team API endpoints (improve error messages)
- All frontend components (add loading states)

**Validation**:
- [ ] Notifications created correctly
- [ ] Emails sent for invitations
- [ ] Confirmation dialogs work
- [ ] Error messages are clear
- [ ] Loading states show appropriately
- [ ] Mobile view works
- [ ] Keyboard navigation works

---

### Phase 7: Testing & Edge Cases (Day 9)

**Goal**: Comprehensive testing and edge case handling

**Test Scenarios**:

1. **Happy Path**
   - [ ] Add member to roster → works
   - [ ] Create workspace → provision modal appears
   - [ ] Select members → bulk provision succeeds
   - [ ] Check workspace_members table → members added
   - [ ] Team member receives notification

2. **Edge Cases**
   - [ ] Add member already in roster → shows existing record
   - [ ] Provision member already in workspace → skips gracefully
   - [ ] Provision unregistered user → creates invitation
   - [ ] Remove from roster → keeps workspace access
   - [ ] Remove from roster + workspaces → removes from all

3. **Subscription Downgrade**
   - [ ] Downgrade to Pro Plus → roster locked
   - [ ] Try to access agency team page → upgrade prompt
   - [ ] Try to add member via API → 403 error
   - [ ] Existing workspace memberships → still work
   - [ ] Upgrade back to agency → access restored

4. **Security**
   - [ ] Non-agency user tries API → rejected
   - [ ] User A tries to access User B's roster → RLS blocks
   - [ ] Provision to workspace user doesn't own → rejected

5. **Performance**
   - [ ] 100+ team members in roster → loads quickly
   - [ ] Bulk provision 20 members → succeeds in <5 seconds
   - [ ] Large workspace count → no slowdown

**Tools**:
- Manual testing
- Postman/Insomnia for API testing
- Browser dev tools for frontend
- Supabase dashboard for database verification

---

### Phase 8: Documentation & Launch (Day 10)

**Goal**: Document feature and prepare for production

**Tasks**:
1. Write user guide
   - How to add team members
   - How to provision to workspaces
   - How to manage team roster

2. Update help center/docs
   - Add to pricing page (agency tier feature)
   - Add screenshots/GIFs

3. Create admin documentation
   - Database schema reference
   - API endpoint documentation
   - Troubleshooting guide

4. Add analytics tracking (optional)
   - Track roster additions
   - Track bulk provisioning usage
   - Track time savings

5. Final production checklist
   - [ ] All migrations tested
   - [ ] All API endpoints tested
   - [ ] All UI components tested
   - [ ] Error handling complete
   - [ ] Notifications working
   - [ ] Security verified
   - [ ] Performance acceptable
   - [ ] Documentation complete

6. Deploy
   - Run migrations on production
   - Deploy API changes
   - Deploy frontend changes
   - Monitor for errors

---

## Technical Reference

### Database Schema Summary

**agency_team_members**
```sql
- id (UUID, PK)
- agency_owner_id (FK to auth.users)
- member_user_id (FK to auth.users, nullable)
- email (TEXT, unique per owner)
- full_name (TEXT)
- default_role (TEXT: admin/editor/view_only/client)
- status (TEXT: pending/active/inactive)
- notes (TEXT)
- created_at, updated_at
```

**agency_workspace_provisions**
```sql
- id (UUID, PK)
- agency_team_member_id (FK)
- workspace_id (FK)
- provisioned_by (FK to auth.users)
- role_assigned (TEXT)
- provision_type (TEXT: bulk/manual)
- provisioned_at
```

### API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agency-team/list` | GET | Fetch team roster |
| `/api/agency-team/add` | POST | Add member to roster |
| `/api/agency-team/update` | POST | Update member details |
| `/api/agency-team/remove` | POST | Remove from roster |
| `/api/agency-team/bulk-provision` | POST | Add members to workspace |
| `/api/workspace/create` | POST | Modified to return roster |

### Frontend Components Summary

| Component | Path | Purpose |
|-----------|------|---------|
| AgencyTeamPage | `/src/pages/AgencyTeamPage.jsx` | Main roster management |
| AddAgencyTeamMemberModal | `/src/components/agency/` | Add member form |
| WorkspaceTeamProvisionModal | `/src/components/workspace/` | Provision modal |

### Key Integration Points

1. **Workspace Creation Flow**
   - `api/workspace/create.js` returns team roster for agency users
   - `CreateWorkspaceModal.jsx` detects roster and shows provision modal

2. **Team Member States**
   - Registered (has member_user_id) → Direct add to workspace_members
   - Unregistered (NULL member_user_id) → Create workspace_invitations

3. **Subscription Checks**
   - API: Check `user_profiles.subscription_tier = 'agency'`
   - Frontend: Check `AuthContext.subscriptionTier`
   - RLS: Built into INSERT policy for agency_team_members

4. **Data Flow**
   ```
   Add to Roster → agency_team_members
                          ↓
   Create Workspace → Show Provision Modal
                          ↓
   Select Members → Bulk Provision API
                          ↓
   Registered Users → workspace_members (direct)
   Unregistered Users → workspace_invitations (via email)
                          ↓
   Track Provision → agency_workspace_provisions
   ```

---

## Rollout Strategy

### Pre-Launch
- [ ] Test with 2-3 agency beta users
- [ ] Gather feedback on UX
- [ ] Fix any issues found
- [ ] Prepare announcement

### Launch
- [ ] Deploy to production (off-peak hours)
- [ ] Monitor error logs
- [ ] Send email to agency users announcing feature
- [ ] Update pricing page

### Post-Launch
- [ ] Monitor usage analytics
- [ ] Collect user feedback
- [ ] Iterate based on feedback
- [ ] Consider enhancements (see below)

---

## Future Enhancements (Post-V1)

**Priority 2 Features** (implement later):
1. **Workspace Templates**
   - Define "Standard Client Setup" with pre-selected team members
   - Apply template when creating workspace

2. **Team Member Departments**
   - Organize roster by department (Content, Design, Strategy)
   - Filter by department when provisioning

3. **Bulk Actions**
   - "Add Sarah to all workspaces" button
   - "Remove John from all workspaces" button

4. **Role Recommendations**
   - Suggest roles based on workspace type
   - Learn from past provisioning patterns

5. **Usage Analytics Dashboard**
   - Show time saved via bulk provisioning
   - Most active team members
   - Workspace coverage per member

6. **Grace Period for Downgrades**
   - 30-day read-only access to roster after downgrade
   - Warning emails before lockout

---

## Troubleshooting Guide

### Common Issues

**Issue**: "Agency team page not showing"
- **Check**: User subscription_tier in user_profiles table
- **Fix**: Update subscription_tier to 'agency' or whitelist user

**Issue**: "Bulk provision fails"
- **Check**: workspace_members table for existing entries
- **Check**: API error logs
- **Fix**: Ensure no duplicate entries, validate workspace_id

**Issue**: "RLS policy blocking insert"
- **Check**: user_profiles.subscription_status = 'active'
- **Check**: user_profiles.subscription_tier = 'agency'
- **Fix**: Update subscription status or whitelist user

**Issue**: "Provision modal not appearing"
- **Check**: Response from /api/workspace/create includes agencyTeamMembers
- **Check**: User subscription_tier in frontend AuthContext
- **Fix**: Verify API modification deployed correctly

---

## Success Metrics

Track these KPIs to measure feature success:

1. **Adoption**
   - % of agency users who create team roster
   - Average team roster size

2. **Usage**
   - Bulk provisions per week
   - Average members provisioned per workspace

3. **Efficiency**
   - Time saved: Compare manual invitations vs bulk provisioning
   - Target: 90%+ time reduction

4. **Satisfaction**
   - User feedback score
   - Support tickets related to team management (should decrease)

---

## Contact & Support

**Implementation Questions**:
- Review full plan: `C:\Users\mageb\.claude\plans\greedy-greeting-allen.md`
- Database schema: See Phase 1 migration file
- API specs: See Phase 2-3 tasks

**Need Help**:
- Check existing codebase patterns for similar features
- Reference existing invitation flow in `/api/invitations/`
- Reference existing modal patterns in `/src/components/`

---

## Checklist: Ready to Start?

Before beginning implementation:
- [ ] Supabase access confirmed
- [ ] Development environment set up
- [ ] Understand existing workspace/invitation flow
- [ ] Reviewed database schema design
- [ ] Reviewed API endpoint design
- [ ] Understand subscription tier system
- [ ] Allocated 8-11 days for implementation
- [ ] Have test agency account ready

**When ready**: Start with Phase 1 (Database Foundation)

---

_Last Updated: 2026-01-19_
_Full Implementation Plan: C:\Users\mageb\.claude\plans\greedy-greeting-allen.md_
