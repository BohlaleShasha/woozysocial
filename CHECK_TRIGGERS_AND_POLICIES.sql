-- Find all triggers that might be causing the auth user creation issue
SELECT
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema IN ('auth', 'public')
ORDER BY event_object_schema, event_object_table, trigger_name;

-- Also check for functions that reference auth.users
SELECT
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) ILIKE '%auth.users%'
    AND n.nspname IN ('public', 'auth')
ORDER BY schema_name, function_name;
