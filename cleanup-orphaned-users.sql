-- Cleanup script for orphaned auth users
-- Run this in your Supabase SQL editor to clean up users created during failed signup attempts

-- Find auth users without profiles (orphaned records)
SELECT
  au.id,
  au.email,
  au.created_at,
  au.confirmed_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ORDER BY au.created_at DESC;

-- After reviewing the results above, uncomment and run this to delete orphaned users:
-- WARNING: This will permanently delete these auth users

/*
DO $$
DECLARE
  user_record RECORD;
  deleted_count INT := 0;
BEGIN
  FOR user_record IN
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
  LOOP
    -- Delete the orphaned auth user
    DELETE FROM auth.users WHERE id = user_record.id;
    deleted_count := deleted_count + 1;

    RAISE NOTICE 'Deleted orphaned user: % (%)', user_record.email, user_record.id;
  END LOOP;

  RAISE NOTICE 'Total orphaned users deleted: %', deleted_count;
END $$;
*/
