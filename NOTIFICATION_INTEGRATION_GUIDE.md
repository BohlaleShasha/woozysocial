# Notification System Integration Guide

This guide documents all the integration points for the notification system, including pending integrations that need to be completed.

## ✅ Completed Integrations

### 1. Approval Notifications
**Location:** `api/post/approve.js`

The approval notification system is already integrated and working:
```javascript
const { sendApprovalNotification } = require("../notifications/helpers");

// After approval/rejection/changes requested
await sendApprovalNotification(supabase, {
  postId: post.id,
  workspaceId: post.workspace_id,
  action: 'approve', // or 'reject', 'changes_requested'
  reviewerId: user.id,
  comment: reviewComment
});
```

### 2. Social Account Disconnection
**Location:** `api/social/disconnect.js`

Already integrated - notifications sent when admins/owners disconnect social accounts.

---

## ⏳ Pending Integrations (To Add After api/post.js Work is Complete)

### 3. Post Now (Immediate Publish) Notifications

**File to modify:** `api/post.js`

**Where to add:** After successful immediate post (line ~411)

**Code to add:**
```javascript
const { sendPostPublishedNotification } = require("./notifications/helpers");

// After successful immediate post insertion (around line 411)
// Inside the block: if (supabase) { ... }
// After: await supabase.from("posts").insert([...])

// Only send if this is an immediate post (not scheduled)
if (!isScheduled && workspaceId) {
  sendPostPublishedNotification(supabase, {
    postId: response.data.id || response.data.postId,
    workspaceId,
    createdByUserId: userId,
    platforms
  }).catch(err => logError('post.notification.published', err));
}
```

**Context:**
- Line ~396-412 handles saving successful posts to database
- Check `isScheduled` variable to determine if it's immediate or scheduled
- Only send notification for immediate posts ("Post Now")
- Make notification call non-blocking with `.catch()`

---

### 4. Failed Post Notifications

**File to modify:** `api/post.js`

**Two locations to add:**

#### Location 1: Axios Error (line ~349-361)
```javascript
const { sendPostFailedNotification } = require("./notifications/helpers");

// After saving failed post to database (around line 360)
// Inside: if (supabase) { ... }

await supabase.from("posts").insert([...]);

// Add notification for failed post
if (workspaceId) {
  sendPostFailedNotification(supabase, {
    postId: null, // Not available in this error case
    workspaceId,
    createdByUserId: userId,
    platforms,
    errorMessage: axiosError.response?.data?.message || axiosError.message
  }).catch(err => logError('post.notification.failed', err));
}
```

#### Location 2: Ayrshare Error Response (line ~374-385)
```javascript
const { sendPostFailedNotification } = require("./notifications/helpers");

// After saving failed post to database (around line 384)
// Inside: if (supabase) { ... }

await supabase.from("posts").insert([...]);

// Add notification for failed post
if (workspaceId) {
  sendPostFailedNotification(supabase, {
    postId: null, // Not available in this error case
    workspaceId,
    createdByUserId: userId,
    platforms,
    errorMessage: response.data.message || 'Post failed'
  }).catch(err => logError('post.notification.failed', err));
}
```

**Context:**
- Line 345-369: Handles Axios errors when calling Ayrshare
- Line 371-393: Handles Ayrshare returning error status
- Both save failed posts to database and should trigger notifications
- Notifications alert admins/editors and post creator about the failure

---

### 5. Scheduled Post Notifications

**File to check:** `api/post.js`

**Status:** ✅ Likely already working

**Location:** Line ~270-283

The scheduled post notification is already triggered via:
```javascript
axios.post(notifyUrl, {
  workspaceId,
  postId: savedPost?.id,
  postCaption: text,
  scheduledAt: scheduledDate,
  platforms
})
```

This calls `/api/notifications/send-approval-request` which should handle it. Verify this is working correctly.

---

## 🔧 Additional Integrations Needed

### 6. Invite Cancellation Notifications

**Files to modify:** Look for workspace invite management endpoints

**Search for:**
- `api/workspace/invitations/cancel.js` or similar
- Any endpoint that deletes workspace invitations

**Code to add:**
```javascript
const { sendInviteCancelledNotification } = require("../notifications/helpers");

// Before/after deleting the invitation
const { data: invitation } = await supabase
  .from('workspace_invitations')
  .select('email, workspace_id')
  .eq('id', invitationId)
  .single();

// Delete the invitation
await supabase
  .from('workspace_invitations')
  .delete()
  .eq('id', invitationId);

// Send notification
if (invitation) {
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', invitation.workspace_id)
    .single();

  sendInviteCancelledNotification(supabase, {
    email: invitation.email,
    workspaceId: invitation.workspace_id,
    workspaceName: workspace?.name || 'workspace',
    cancelledByUserId: currentUserId
  }).catch(err => logError('invite.cancel.notification', err));
}
```

---

### 7. Social Account Linking Notifications

**Integration approach:** Frontend-triggered

**File to modify:** `src/components/SocialAccounts.jsx`

**Where to add:** In the `syncAccountsToDatabase` function (line ~63-100)

**Code to add:**
```javascript
// After successfully upserting new accounts (line ~96)
if (newAccounts.length > 0) {
  await supabase
    .from('connected_accounts')
    .upsert(newAccounts, {
      onConflict: 'user_id,platform,platform_user_id'
    });

  // Notify workspace admins about newly linked accounts
  if (activeWorkspace?.id) {
    newAccounts.forEach(async (account) => {
      try {
        await fetch(`${baseURL}/api/social/notify-account-linked`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platform: account.platform,
            userId: user.id,
            workspaceId: activeWorkspace.id
          })
        });
      } catch (err) {
        console.warn('Failed to send account linked notification:', err);
      }
    });
  }
}
```

**Alternative approach:** Move notification logic to backend

Create an endpoint like `api/social/sync-accounts.js` that handles both database sync and notifications, then call it from frontend instead of direct Supabase calls.

---

### 8. Comment Notifications

**Status:** ✅ Helper function is enhanced and ready

**File to check:** Look for comment creation endpoints

**Search for:**
- `api/comments/create.js` or similar
- `api/posts/[postId]/comments.js`
- Frontend component that creates comments

**Code to add:**
```javascript
const { sendNewCommentNotification } = require("../notifications/helpers");

// After creating the comment
const { data: comment, error } = await supabase
  .from('post_comments')
  .insert({
    post_id: postId,
    user_id: userId,
    comment: commentText
  })
  .select()
  .single();

if (!error && comment) {
  // Get user's name
  const { data: userProfile } = await supabase
    .from('user_profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single();

  const userName = userProfile?.full_name || userProfile?.email || 'Someone';

  // Send notification
  sendNewCommentNotification(supabase, {
    postId,
    workspaceId,
    commenterId: userId,
    commenterName: userName,
    comment: commentText
  }).catch(err => logError('comment.notification', err));
}
```

**Note:** The enhanced `sendNewCommentNotification` helper now:
- Notifies post creator
- Notifies other commenters
- For pending approval posts, also notifies approvers (clients/admins)
- Customizes message based on post status

---

## 🎯 Integration Checklist

Use this checklist when adding integrations:

- [ ] Import notification helper at top of file
- [ ] Add notification call after the main action completes
- [ ] Make notification call non-blocking (`.catch()` or `try/catch`)
- [ ] Pass all required parameters to helper function
- [ ] Include proper error logging if notification fails
- [ ] Verify workspace context is available (workspaceId)
- [ ] Test notification appears in NotificationBell
- [ ] Verify notification routes to correct page when clicked

---

## 📋 Testing Checklist

After adding integrations, test each notification type:

### Team Member Notifications
- [ ] Send workspace invite → Verify recipient gets notification
- [ ] Accept invite → Verify inviter gets notification
- [ ] Cancel invite → Verify recipient gets notification
- [ ] Change member role → Verify member gets notification
- [ ] Remove member → Verify removed member gets notification

### Post Notifications
- [ ] Create scheduled post → Verify admins get notification
- [ ] Post now (immediate) → Verify admins get notification
- [ ] Post fails → Verify creator and admins get notification
- [ ] Client approves post → Verify creator gets notification
- [ ] Client rejects post → Verify creator gets notification
- [ ] Client requests changes → Verify creator gets notification

### Social Account Notifications
- [ ] Link social account → Verify admins/owners get notification
- [ ] Unlink social account → Verify admins/owners get notification

### Comment Notifications
- [ ] Comment on pending post → Verify creator and approvers get notification
- [ ] Comment on published post → Verify creator and other commenters get notification

---

## 🐛 Debugging Tips

### Notification not appearing?

1. **Check database:** Query notifications table directly
   ```sql
   SELECT * FROM notifications WHERE user_id = 'YOUR_USER_ID' ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check RLS policies:** Ensure user can SELECT their notifications
   ```sql
   SELECT * FROM notifications WHERE auth.uid() = user_id LIMIT 1;
   ```

3. **Check real-time subscription:** Look for WebSocket errors in browser console

4. **Check notification helper:** Add console.log to helper functions to verify they're being called

5. **Check API logs:** Look for `logError` outputs related to notifications

### Notification appearing but not routing correctly?

1. Check `NOTIFICATION_CONFIG` in `NotificationBell.jsx` has entry for notification type
2. Verify the route exists in your React Router setup
3. Check user has permission to access the route

### Notifications sending to wrong users?

1. Review the helper function's user selection logic
2. Verify workspace membership queries are correct
3. Check if notification is being sent to actor (should exclude them)

---

## 📚 Helper Function Reference

All helper functions are in `api/notifications/helpers.js`:

| Function | Purpose | Required Parameters |
|----------|---------|---------------------|
| `sendApprovalNotification` | Post approval decisions | `postId, workspaceId, action, reviewerId, comment` |
| `sendWorkspaceInviteNotification` | Workspace invites | `email, workspaceId, workspaceName, inviterId, inviteToken, role` |
| `sendInviteAcceptedNotification` | Invite accepted | `workspaceId, inviterId, acceptedByUserId, acceptedByName` |
| `sendInviteCancelledNotification` | Invite cancelled | `email, workspaceId, workspaceName, cancelledByUserId` |
| `sendRoleChangedNotification` | Member role changes | `userId, workspaceId, workspaceName, oldRole, newRole, changedByUserId` |
| `sendMemberJoinedNotification` | New member joins | `workspaceId, newMemberName, newMemberId, notifyUserIds` |
| `sendMemberRemovedNotification` | Member removed | `removedUserId, workspaceId, workspaceName, removedByUserId, removedByName` |
| `sendNewCommentNotification` | Comments on posts | `postId, workspaceId, commenterId, commenterName, comment` |
| `sendPostScheduledNotification` | Post scheduled | `postId, workspaceId, scheduledAt, platforms, createdByUserId` |
| `sendPostPublishedNotification` | Post published (now) | `postId, workspaceId, createdByUserId, platforms` |
| `sendPostFailedNotification` | Post failed | `postId, workspaceId, createdByUserId, platforms, errorMessage` |
| `sendSocialAccountLinkedNotification` | Social account linked | `workspaceId, platform, linkedByUserId, linkedByName` |
| `sendSocialAccountUnlinkedNotification` | Social account unlinked | `workspaceId, platform, unlinkedByUserId, unlinkedByName` |
| `sendInboxMessageNotification` | Social inbox messages | `workspaceId, platform, senderName, messagePreview` |

---

## 🎨 Adding New Notification Types

To add a new notification type:

1. **Add to database migration comments** (`migrations/005_notifications_table.sql`)
   ```sql
   -- 'new_notification_type'  - Description of what it's for
   ```

2. **Create helper function** (`api/notifications/helpers.js`)
   ```javascript
   async function sendNewNotification(supabase, { params }) {
     try {
       // Query for users to notify
       // Construct notification object(s)
       // Insert into notifications table
     } catch (error) {
       logError('notifications.helpers.newNotification', error, { params });
     }
   }
   ```

3. **Export helper** (at bottom of `helpers.js`)
   ```javascript
   module.exports = {
     // ... existing exports
     sendNewNotification
   };
   ```

4. **Add frontend config** (`src/components/NotificationBell.jsx`)
   ```javascript
   new_notification_type: {
     icon: "🔔",
     route: "/destination",
     color: "#3b82f6"
   }
   ```

5. **Add integration point** in the appropriate API endpoint/component

6. **Test thoroughly** using checklist above

---

## 📞 Support

For questions about the notification system:
- Check existing notification types in `migrations/005_notifications_table.sql`
- Review helper implementations in `api/notifications/helpers.js`
- See frontend routing in `src/components/NotificationBell.jsx`
- Refer to this integration guide for patterns

---

**Last Updated:** 2026-01-14
**Status:** Core system complete, pending api/post.js integrations
