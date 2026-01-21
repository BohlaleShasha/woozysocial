# Fix Brand Profile Infinite Recursion Error

## The Problem
The brand_profiles table has an RLS policy that causes infinite recursion when checking workspace_members.

## The Solution
Run this SQL in your Supabase SQL Editor to fix the RLS policies.

## Steps:

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Copy and paste this entire SQL block:

```sql
-- Fix infinite recursion in brand_profiles RLS policies
-- Drop existing policies
DROP POLICY IF EXISTS "Members can view brand profiles" ON brand_profiles;
DROP POLICY IF EXISTS "Members can manage brand profiles" ON brand_profiles;

-- Create a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION auth.user_is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspace_uuid
      AND workspace_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new non-recursive policies
CREATE POLICY "Members can view brand profiles"
  ON brand_profiles FOR SELECT
  USING (auth.user_is_workspace_member(workspace_id));

CREATE POLICY "Members can insert brand profiles"
  ON brand_profiles FOR INSERT
  WITH CHECK (auth.user_is_workspace_member(workspace_id));

CREATE POLICY "Members can update brand profiles"
  ON brand_profiles FOR UPDATE
  USING (auth.user_is_workspace_member(workspace_id))
  WITH CHECK (auth.user_is_workspace_member(workspace_id));

CREATE POLICY "Members can delete brand profiles"
  ON brand_profiles FOR DELETE
  USING (auth.user_is_workspace_member(workspace_id));
```

5. Click **"Run"** or press Ctrl+Enter
6. You should see "Success"

## Then Test:

1. Refresh your brand profile page
2. Fill in all the fields
3. Click "Save Brand Profile"
4. Should work without the recursion error!

## What This Does:

The fix creates a `SECURITY DEFINER` function that bypasses RLS when checking workspace membership, preventing the infinite recursion. This is a common pattern in Supabase for avoiding RLS recursion issues.
