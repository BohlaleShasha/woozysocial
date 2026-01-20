-- Remove ALL foreign key constraints to auth.users
-- This is causing "Database error creating new user"

-- Step 1: Find and drop all FK constraints to auth.users
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT
            tc.table_schema,
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_schema = 'auth'
            AND ccu.table_name = 'users'
            AND tc.table_schema = 'public'
    LOOP
        RAISE NOTICE 'Dropping constraint % on table %.%',
            constraint_record.constraint_name,
            constraint_record.table_schema,
            constraint_record.table_name;

        EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE',
            constraint_record.table_schema,
            constraint_record.table_name,
            constraint_record.constraint_name);
    END LOOP;
END $$;

-- Step 2: Verify all constraints are removed
SELECT
    tc.table_schema,
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users';

-- If the above returns no rows, the fix is complete!
-- Now try creating a user in Supabase dashboard.
