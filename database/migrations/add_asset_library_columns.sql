-- Add new columns to media_assets table for asset library features
-- Run this migration on your Supabase project

ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS description TEXT;
