# Comment System Fix Instructions

## Issue
The comment system was failing with error: "Could not find a relationship between 'post_comments' and 'user_profiles' in the schema cache"

## Solution Applied

### 1. Immediate Fix (Already Done)
I've updated the API ([api/post/comment.js](api/post/comment.js)) with a fallback mechanism that:
- Tries to fetch comments with user profiles using the relationship
- If relationship error occurs, falls back to fetching separately and joining in memory
- **This means comments will work immediately after deployment, even without the migration**

### 2. Proper Database Fix (Run This Migration)

Apply the migration file: [migrations/007_fix_comment_relationships.sql](migrations/007_fix_comment_relationships.sql)

**How to apply:**
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/007_fix_comment_relationships.sql`
4. Paste and click **Run**

This migration:
- Adds the proper foreign key constraint between `post_comments.user_id` and `user_profiles.id`
- Verifies the constraint was created successfully
- Makes future queries more efficient

## What Changed

### Files Modified:
- `api/post/comment.js` - Added fallback query logic for relationship errors
- `migrations/007_fix_comment_relationships.sql` - New migration to establish foreign key

## Testing

After deploying the code changes:

1. **Test comment submission:**
   - Open a post detail panel
   - Add a comment with priority
   - Should save successfully and appear in the thread

2. **Test @mentions:**
   - Type `@` in the comment box
   - Autocomplete dropdown should appear
   - Select a team member and submit
   - They should receive a notification

3. **Test real-time updates:**
   - Open the same post in two browser windows
   - Add a comment in one window
   - Should appear in the other window within 30 seconds

4. **After running the migration:**
   - Check Vercel logs - should no longer see "relationship not found" message
   - Comments should fetch slightly faster (using direct relationship)

## Rollback

If needed, you can rollback the migration:
```sql
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS fk_post_comments_user_id;
```

The API will continue working with the fallback method.

## Notes

- The fallback method is slightly less efficient (2 queries instead of 1) but completely functional
- Once the migration is applied, the API will automatically use the more efficient relationship query
- No code changes needed after applying the migration
