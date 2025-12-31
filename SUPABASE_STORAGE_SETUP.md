# Supabase Storage Setup for Logo Uploads

## Step 1: Add logo_url Column to Database

Run this SQL in your Supabase SQL Editor:

```sql
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

## Step 2: Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/adyeceovkhnacaxkymih/storage/buckets

2. Click "Create a new bucket"

3. **Bucket name:** `user-assets`

4. **Public bucket:** ✅ Yes (check this box)
   - This allows uploaded logos to be publicly accessible via URL

5. Click "Create bucket"

## Step 3: Set Up Storage Policies (Security)

After creating the bucket, click on it and go to "Policies" tab:

### Policy 1: Allow Users to Upload Their Own Logos

```sql
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-assets' AND
  (storage.foldername(name))[1] = 'logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);
```

### Policy 2: Allow Public Read Access

```sql
CREATE POLICY "Public read access for user assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-assets');
```

### Policy 3: Allow Users to Delete Their Own Logos

```sql
CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-assets' AND
  (storage.foldername(name))[1] = 'logos' AND
  auth.uid()::text = (storage.foldername(name))[2]
);
```

## Step 4: Test the Upload

1. Go to Settings page in your app
2. Click "Upload Logo" under Company Logo section
3. Select an image file (PNG, JPG, or SVG)
4. Logo should upload and appear in the preview
5. Check the sidebar - your logo should now appear instead of [LOGO]

## Folder Structure

Logos will be stored in this structure:
```
user-assets/
  └── logos/
      └── {user_id}-logo-{timestamp}.{ext}
```

Example: `user-assets/logos/abc123-logo-1735656000000.png`

## Troubleshooting

**Issue:** "Error uploading logo: new row violates row-level security policy"
- **Fix:** Make sure you've created the INSERT policy above

**Issue:** Logo doesn't appear in sidebar
- **Fix:** Refresh the page after uploading. The AuthContext should reload the profile.

**Issue:** "Bucket not found"
- **Fix:** Make sure the bucket name is exactly `user-assets` (lowercase, with hyphen)

**Issue:** Logo URL is not accessible (404 error)
- **Fix:** Make sure you created the bucket as **Public**

## Verification

To verify everything is working:

1. Upload a logo in Settings
2. Check Supabase Storage browser - you should see the file under `user-assets/logos/`
3. Open the public URL in a new tab - the image should load
4. Check the sidebar - logo should display
5. Check `user_profiles` table - `logo_url` column should have the Supabase storage URL
