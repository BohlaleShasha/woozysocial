# Draft Comments & Edit Button Deployment Guide

## Issues Fixed

### Issue 1: Comments Not Working on Drafts
**Problem**: Clicking "Add Comment" on drafts showed "Failed to create comment"
**Root Cause**: Drafts use `post_drafts.id` but comments table only referenced `posts.id`
**Solution**: Extended comments to support BOTH posts and drafts

### Issue 2: No Edit Button for pending_approval Posts
**Problem**: Admins couldn't provide feedback on pending posts because editors had no way to edit them
**Root Cause**: Schedule page wasn't passing `onEditScheduledPost` prop to PostDetailPanel
**Solution**: Added edit handler that loads post into Compose page

---

## Deployment Steps

### 1. Deploy Code (Already Pushed ✅)
The code has been pushed to main and will deploy automatically on Vercel.

### 2. Apply Database Migration (CRITICAL - Do This Now!)

Go to **Supabase SQL Editor** and run the migration:

```sql
-- Location: migrations/008_support_draft_comments.sql

-- Add optional draft_id column to post_comments
ALTER TABLE post_comments
ADD COLUMN IF NOT EXISTS draft_id UUID REFERENCES post_drafts(id) ON DELETE CASCADE;

-- Create index for draft comments
CREATE INDEX IF NOT EXISTS idx_post_comments_draft_id
ON post_comments(draft_id);

-- Make post_id nullable (to allow draft_id instead)
ALTER TABLE post_comments
ALTER COLUMN post_id DROP NOT NULL;

-- Add constraint: either post_id OR draft_id must be set (but not both)
ALTER TABLE post_comments
ADD CONSTRAINT check_post_or_draft
CHECK (
  (post_id IS NOT NULL AND draft_id IS NULL) OR
  (post_id IS NULL AND draft_id IS NOT NULL)
);
```

**Verify the migration:**
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'post_comments'
AND column_name IN ('post_id', 'draft_id');
```

Expected output:
```
| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| post_id     | uuid      | YES         |
| draft_id    | uuid      | YES         |
```

---

## Testing Checklist

### Test Draft Comments
1. **Go to Posts page → Drafts tab**
2. Click on any draft
3. Side panel opens from right
4. Type a comment in the text area
5. Select priority (Normal/High/Urgent)
6. Click "Add Comment"
7. **Expected**: ✅ Success toast, comment appears in thread
8. **Before**: ❌ "Failed to create comment" error

### Test Edit Button on pending_approval Posts
1. **Go to Schedule page**
2. Click on a post with status "Pending Approval" (yellow badge)
3. Side panel opens
4. Scroll down past comments
5. **Expected**: ✅ Blue "Edit Post" button appears
6. Click "Edit Post"
7. **Expected**: ✅ Navigates to Compose page with post data loaded
8. Make changes and save
9. **Expected**: ✅ Post updates, admin can see changes

### Test Full Workflow
**Scenario**: Admin gives feedback, editor makes changes

1. **Admin**: View pending post on Schedule page
2. **Admin**: Add comment: "Please use a brighter image"
3. **Admin**: Set priority to "High"
4. **Editor**: View same post, sees comment with 🟠 High badge
5. **Editor**: Click "Edit Post" button
6. **Editor**: Replace image in Compose page
7. **Editor**: Save/schedule post
8. **Admin**: Refresh, sees updated post
9. **Admin**: Approves post
10. **Expected**: ✅ Seamless collaboration workflow

---

## What Changed (Technical Details)

### Database Schema
- `post_comments.post_id` now nullable
- New column: `post_comments.draft_id` (nullable, references post_drafts.id)
- New constraint: Ensures exactly ONE of (post_id, draft_id) is set
- New index: `idx_post_comments_draft_id` for performance

### API Updates (`api/post/comment.js`)
- **POST**: Accepts `postId` OR `draftId` (validates only one provided)
- **GET**: Fetches by `postId` OR `draftId`
- Draft comments skip notifications (drafts are pre-workflow)
- Fallback query supports both ID types

### Frontend Updates
- **CommentInput.jsx**: Accepts `draftId` prop, passes correct ID to API
- **CommentThread.jsx**: Accepts `draftId` prop, fetches comments correctly
- **PostDetailPanel.jsx**: Detects draft status, passes appropriate ID
- **ScheduleContent.jsx**: Added `handleEditScheduledPost` handler

---

## Rollback Plan (If Needed)

If something breaks, rollback with:

```sql
-- Remove constraint
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS check_post_or_draft;

-- Make post_id required again
ALTER TABLE post_comments ALTER COLUMN post_id SET NOT NULL;

-- Drop index
DROP INDEX IF EXISTS idx_post_comments_draft_id;

-- Remove column
ALTER TABLE post_comments DROP COLUMN IF EXISTS draft_id;
```

Then redeploy previous git commit.

---

## Success Metrics

✅ Draft comments save successfully
✅ Draft comments display in real-time
✅ Edit button appears on pending_approval posts (Schedule page)
✅ Clicking Edit loads post into Compose
✅ No errors in browser console
✅ No errors in Vercel logs

---

## Next Steps After Deployment

1. Run the migration in Supabase
2. Wait for Vercel to finish deploying (~2 minutes)
3. Test all scenarios above
4. Monitor for errors

**Ready to test!** 🚀
