-- =====================================================
-- FIX COMMENT RELATIONSHIPS
-- Establishes proper foreign key relationships for post_comments
-- =====================================================

-- Drop existing constraint if it exists (in case of re-run)
ALTER TABLE post_comments
DROP CONSTRAINT IF EXISTS fk_post_comments_user_id;

-- Add foreign key constraint to user_profiles
ALTER TABLE post_comments
ADD CONSTRAINT fk_post_comments_user_id
FOREIGN KEY (user_id) REFERENCES user_profiles(id)
ON DELETE CASCADE;

-- Verify the foreign key was created
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'post_comments'
  AND kcu.column_name = 'user_id';

-- =====================================================
-- ROLLBACK SQL (if needed)
-- =====================================================
-- ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS fk_post_comments_user_id;
