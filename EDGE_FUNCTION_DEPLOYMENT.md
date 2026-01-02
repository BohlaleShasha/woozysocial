# Supabase Edge Function Deployment Guide

## Overview

This guide explains how to deploy the `send-team-invite` Edge Function to Supabase so that team invitations can be sent via email.

---

## Prerequisites

Before deploying, make sure you have:

1. **Supabase CLI installed**
2. **Supabase project created** (you should already have this)
3. **Database migrations completed** (team_invitations table created)
4. **Email service configured** (optional but recommended - Resend API)

---

## Step 1: Install Supabase CLI

If you haven't installed the Supabase CLI yet:

### Windows (PowerShell):
```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### macOS/Linux:
```bash
brew install supabase/tap/supabase
```

### Alternative (npm):
```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

---

## Step 2: Login to Supabase

```bash
supabase login
```

This will open a browser window to authenticate. Follow the prompts.

---

## Step 3: Link Your Project

Navigate to your project directory:
```bash
cd c:\Users\mageb\OneDrive\Desktop\woozy\AyrshareAPI_Demo\social-api-demo
```

Link to your Supabase project:
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**To find your PROJECT_REF:**
1. Go to your Supabase dashboard: https://app.supabase.com
2. Select your project
3. Go to Settings > General
4. Copy the "Reference ID"

---

## Step 4: Set Up Environment Variables (Secrets)

The Edge Function needs environment variables to work properly:

### Required Secrets:

1. **SUPABASE_URL** - Auto-configured by Supabase ✓
2. **SUPABASE_ANON_KEY** - Auto-configured by Supabase ✓
3. **APP_URL** - Your app's URL (for invite links)
4. **RESEND_API_KEY** - For sending emails (optional but recommended)

### Set the secrets:

```bash
# Set your app URL (use your production URL when deploying to prod)
supabase secrets set APP_URL=http://localhost:5173

# Set Resend API key (get this from resend.com)
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### How to get a Resend API Key:

1. Go to https://resend.com
2. Sign up for a free account (100 emails/day free)
3. Go to API Keys section
4. Create a new API key
5. Copy the key and use it in the command above

**Note:** If you don't set up Resend, the invitation will still be created in the database, but no email will be sent. Users would need to be invited through another method.

---

## Step 5: Deploy the Edge Function

Deploy the function to Supabase:

```bash
supabase functions deploy send-team-invite
```

This command will:
- Package the function code
- Upload it to Supabase
- Make it available at: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-team-invite`

### Expected output:
```
Deploying function send-team-invite...
Function send-team-invite deployed successfully
Function URL: https://xxxxx.supabase.co/functions/v1/send-team-invite
```

---

## Step 6: Verify Deployment

Test the function is deployed:

```bash
supabase functions list
```

You should see `send-team-invite` in the list.

---

## Step 7: Configure Email Domain (For Production)

### Update the Edge Function Email "From" Address:

1. Open [supabase/functions/send-team-invite/index.ts](supabase/functions/send-team-invite/index.ts)
2. Find line with `from: 'Social Media Team <noreply@yourdomain.com>'`
3. Replace `yourdomain.com` with your actual domain
4. Redeploy: `supabase functions deploy send-team-invite`

### Verify Domain in Resend:

1. Go to Resend Dashboard > Domains
2. Add your domain
3. Add the DNS records they provide
4. Verify the domain

**Note:** For development/testing, you can use Resend's test domain.

---

## Step 8: Update Environment Variables in Frontend

Make sure your frontend has the correct Supabase URL and Anon Key.

Create/update `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**To find these values:**
1. Supabase Dashboard > Settings > API
2. Copy "Project URL" → `VITE_SUPABASE_URL`
3. Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

---

## Step 9: Test the Integration

### Local Testing:

1. Start your dev server:
```bash
npm run dev
```

2. Go to the Team page
3. Click "Add Member"
4. Enter an email and select a role
5. Click "Send Invite"

### Check the results:

**In Browser Console:**
- Should see: `Invitation sent successfully: {...}`

**In Supabase Dashboard:**
1. Go to Table Editor
2. Open `team_invitations` table
3. You should see a new row with status `pending`

**In Email Inbox:**
- Check the invited user's email inbox
- Should receive invitation email (if Resend is configured)

---

## Step 10: Monitor Edge Function Logs

To see Edge Function logs in real-time:

```bash
supabase functions logs send-team-invite
```

Or view in Supabase Dashboard:
1. Go to Edge Functions section
2. Click on `send-team-invite`
3. View the Logs tab

---

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution:** Make sure you've set the secrets:
```bash
supabase secrets list
```

### Error: "Unauthorized" when calling function

**Possible causes:**
1. User is not logged in - check `supabase.auth.getUser()`
2. RLS policies not set up correctly
3. Supabase client not passing auth header

**Solution:**
- Make sure user is authenticated before calling the function
- Check that Authorization header is being sent

### Error: "Failed to send email"

**Possible causes:**
1. RESEND_API_KEY not set or invalid
2. Email domain not verified
3. Rate limit exceeded (free tier: 100 emails/day)

**Solution:**
- Check secrets: `supabase secrets list`
- Verify domain in Resend dashboard
- Check Resend dashboard for errors

### Error: "Email already invited"

This is expected behavior - you can't invite the same email twice.

**Solution:**
- Delete the existing invitation from Supabase table editor, or
- Wait for it to expire, or
- Use a different email

### Edge Function not updating after changes

**Solution:** Redeploy the function:
```bash
supabase functions deploy send-team-invite --no-verify-jwt
```

---

## Development Workflow

### Local Development (Optional):

You can run Edge Functions locally for faster development:

```bash
# Start Supabase locally
supabase start

# Serve the function locally
supabase functions serve send-team-invite
```

Then update your code to call the local URL:
- Local: `http://localhost:54321/functions/v1/send-team-invite`
- Production: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-team-invite`

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Database migrations completed (`team_invitations` table exists)
- [ ] RLS policies are set up correctly
- [ ] Resend API key configured (`RESEND_API_KEY` secret set)
- [ ] Domain verified in Resend
- [ ] Update email "from" address in Edge Function code
- [ ] Set `APP_URL` to production URL
- [ ] Edge Function deployed: `supabase functions deploy send-team-invite`
- [ ] Frontend `.env` has correct Supabase URL and keys
- [ ] Test invitation flow end-to-end
- [ ] Monitor Edge Function logs for errors

---

## Security Notes

1. **Never commit secrets** to Git (API keys, etc.)
2. **Use Supabase secrets** for sensitive data
3. **RLS policies** protect your data - make sure they're configured
4. **CORS headers** are configured in the Edge Function for your domain
5. **Email validation** prevents malicious input

---

## Cost Considerations

**Supabase Edge Functions:**
- Free tier: 500,000 invocations/month
- After that: $2 per 1M invocations

**Resend Email Service:**
- Free tier: 100 emails/day (3,000/month)
- After that: $20/month for 50,000 emails

For most small-to-medium teams, the free tiers should be sufficient.

---

## Next Steps

After deploying the Edge Function:

1. **Phase 5**: Build the "Accept Invite" page (where users click the link in the email)
2. **Phase 6**: Fetch and display real team members from the database
3. **Phase 7**: Implement role management
4. **Phase 8**: Add remove member functionality

---

## Support

- **Supabase Docs**: https://supabase.com/docs/guides/functions
- **Resend Docs**: https://resend.com/docs
- **Edge Function Code**: [supabase/functions/send-team-invite/index.ts](supabase/functions/send-team-invite/index.ts)

If you encounter issues, check the Edge Function logs first:
```bash
supabase functions logs send-team-invite --tail
```
