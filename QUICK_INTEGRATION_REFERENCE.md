# Quick Integration Reference

Quick copy-paste snippets for adding the pending notification integrations to `api/post.js`.

---

## 📋 Before You Start

1. Ensure the other Claude session has finished debugging "Post Now"
2. Make a backup of `api/post.js` before modifying
3. Read [NOTIFICATION_INTEGRATION_GUIDE.md](NOTIFICATION_INTEGRATION_GUIDE.md) for context

---

## 1️⃣ Import Statement (Top of File)

**Location:** Top of `api/post.js` (after existing imports, around line 15)

```javascript
const {
  sendPostPublishedNotification,
  sendPostFailedNotification
} = require("./notifications/helpers");
```

---

## 2️⃣ Post Now Notification (Immediate Publish Success)

**Location:** Line ~411 (after successful immediate post save to database)

**Look for this code block:**
```javascript
// Save successful post to database
if (supabase) {
  const ayrPostId = response.data.id || response.data.postId;
  await supabase.from("posts").insert([{
    user_id: userId,
    workspace_id: workspaceId,
    created_by: userId,
    ayr_post_id: ayrPostId,
    caption: text,
    media_urls: mediaUrl ? [mediaUrl] : [],
    status: isScheduled ? 'scheduled' : 'posted',
    scheduled_at: isScheduled ? new Date(scheduledDate).toISOString() : null,
    posted_at: isScheduled ? null : new Date().toISOString(),
    platforms: platforms,
    approval_status: 'approved',
    requires_approval: false
  }]).catch(dbErr => logError('post.save_success', dbErr));
}
```

**Add this AFTER the closing `}` of the `if (supabase)` block:**
```javascript
// Send notification for immediate posts (Post Now)
if (!isScheduled && workspaceId) {
  sendPostPublishedNotification(supabase, {
    postId: response.data.id || response.data.postId,
    workspaceId,
    createdByUserId: userId,
    platforms
  }).catch(err => logError('post.notification.published', err));
}
```

---

## 3️⃣ Failed Post Notification (Axios Error)

**Location:** Line ~360 (inside the axios catch block, after saving failed post)

**Look for this code block:**
```javascript
} catch (axiosError) {
  logError('post.ayrshare_request', axiosError, { platforms });

  // Save failed post to database
  if (supabase) {
    await supabase.from("posts").insert([{
      user_id: userId,
      workspace_id: workspaceId,
      created_by: userId,
      caption: text,
      media_urls: mediaUrl ? [mediaUrl] : [],
      status: 'failed',
      scheduled_at: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      platforms: platforms,
      last_error: axiosError.response?.data?.message || axiosError.message
    }]).catch(dbErr => logError('post.save_failed', dbErr));
  }

  return sendError(
    res,
    "Failed to connect to social media service",
    ErrorCodes.EXTERNAL_API_ERROR,
    axiosError.response?.data
  );
}
```

**Add this AFTER the `if (supabase) { ... }` block closes, BEFORE the `return sendError`:**
```javascript
  // Send notification for failed post
  if (workspaceId) {
    sendPostFailedNotification(supabase, {
      postId: null,
      workspaceId,
      createdByUserId: userId,
      platforms,
      errorMessage: axiosError.response?.data?.message || axiosError.message
    }).catch(err => logError('post.notification.failed.axios', err));
  }
```

---

## 4️⃣ Failed Post Notification (Ayrshare Error Response)

**Location:** Line ~384 (when Ayrshare returns error status, after saving failed post)

**Look for this code block:**
```javascript
if (response.data.status === 'error') {
  // Save failed post to database
  if (supabase) {
    await supabase.from("posts").insert([{
      user_id: userId,
      workspace_id: workspaceId,
      created_by: userId,
      caption: text,
      media_urls: mediaUrl ? [mediaUrl] : [],
      status: 'failed',
      scheduled_at: scheduledDate ? new Date(scheduledDate).toISOString() : null,
      platforms: platforms,
      last_error: response.data.message || 'Post failed'
    }]).catch(dbErr => logError('post.save_failed', dbErr));
  }

  return sendError(
    res,
    response.data.message || "Failed to post to social platforms",
    ErrorCodes.EXTERNAL_API_ERROR,
    response.data
  );
}
```

**Add this AFTER the `if (supabase) { ... }` block closes, BEFORE the `return sendError`:**
```javascript
  // Send notification for failed post
  if (workspaceId) {
    sendPostFailedNotification(supabase, {
      postId: null,
      workspaceId,
      createdByUserId: userId,
      platforms,
      errorMessage: response.data.message || 'Post failed'
    }).catch(err => logError('post.notification.failed.ayrshare', err));
  }
```

---

## ✅ Testing After Integration

### Test Post Now Notification
1. Create an immediate post (Post Now)
2. Check notifications bell for admins (not the poster)
3. Verify notification shows platform list
4. Click notification → should route to `/posts`

### Test Failed Post Notification (Method 1: Simulate)
1. Temporarily break Ayrshare API key in `.env`
2. Try to post immediately
3. Check notifications bell for creator + admins/editors
4. Verify error message appears in notification
5. Click notification → should route to `/posts`
6. Fix API key

### Test Failed Post Notification (Method 2: Invalid Data)
1. Try to post with invalid/unsupported content
2. Wait for Ayrshare error response
3. Check notifications (same as above)

---

## 🐛 Quick Troubleshooting

**Notification not appearing?**
```sql
-- Check if notification was created
SELECT * FROM notifications
WHERE workspace_id = 'YOUR_WORKSPACE_ID'
ORDER BY created_at DESC
LIMIT 5;
```

**Error in console?**
- Check import statement is correct
- Verify `workspaceId` exists (don't send if null)
- Check `supabase` is initialized
- Look for `logError` outputs in console

**Notification sent but can't click?**
- Verify `/posts` route exists in React Router
- Check user has permission to access route
- Clear browser cache/localStorage

---

## 📞 Need Help?

See detailed documentation:
- [NOTIFICATION_INTEGRATION_GUIDE.md](NOTIFICATION_INTEGRATION_GUIDE.md) - Full integration guide
- [NOTIFICATION_SYSTEM_IMPLEMENTATION.md](NOTIFICATION_SYSTEM_IMPLEMENTATION.md) - What was built
- `api/notifications/helpers.js` - Helper function implementations
- `src/components/NotificationBell.jsx` - Frontend notification display

---

**Ready to integrate?** Just copy the snippets above into the appropriate locations in `api/post.js`!
