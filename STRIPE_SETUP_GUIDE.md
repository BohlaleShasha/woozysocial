# Stripe Setup Guide for Woozy Social

This guide walks you through setting up Stripe payments step-by-step.

---

## Overview

You need to add **7 environment variables** to your `functions/.env` file:

```env
STRIPE_SECRET_KEY=sk_test_xxx        # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx      # Webhook signing secret
STRIPE_PRICE_SOLO=price_xxx          # Price ID for Solo tier
STRIPE_PRICE_PRO=price_xxx           # Price ID for Pro tier
STRIPE_PRICE_PRO_PLUS=price_xxx      # Price ID for Pro Plus tier
STRIPE_PRICE_AGENCY=price_xxx        # Price ID for Agency tier
STRIPE_PRICE_BRAND_BOLT=price_xxx    # Price ID for BrandBolt tier
```

And **1 variable** to your frontend `.env` file (in the social-api-demo root):

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # Your Stripe publishable key
```

---

## Step 1: Get Your Stripe API Keys

### 1.1 Go to Stripe Dashboard
1. Open https://dashboard.stripe.com
2. Log in to your Stripe account (or create one if needed)

### 1.2 Find Your API Keys
1. Click **"Developers"** in the left sidebar
2. Click **"API keys"**
3. You'll see two keys:
   - **Publishable key** - starts with `pk_test_` (for test mode) or `pk_live_` (for live mode)
   - **Secret key** - starts with `sk_test_` or `sk_live_`

### 1.3 Copy the Keys
1. Copy the **Secret key** → This goes in `functions/.env` as `STRIPE_SECRET_KEY`
2. Copy the **Publishable key** → This goes in your frontend `.env` as `VITE_STRIPE_PUBLISHABLE_KEY`

**Important:** Use TEST keys (`sk_test_`, `pk_test_`) while developing. Switch to LIVE keys (`sk_live_`, `pk_live_`) only when going to production.

---

## Step 2: Create Your Products and Prices

### 2.1 Go to Products
1. In Stripe Dashboard, click **"Products"** in the left sidebar
2. Click **"+ Add product"** button

### 2.2 Create Each Pricing Tier

You need to create **5 products** (one for each tier). For each product:

#### Solo Plan (£35/month)
1. Click **"+ Add product"**
2. Fill in:
   - **Name:** Solo
   - **Description:** 1 social profile, 50 scheduled posts/month, Basic analytics
3. Under **"Price information"**:
   - **Pricing model:** Standard pricing
   - **Price:** 35.00
   - **Currency:** GBP (or your currency)
   - **Billing period:** Monthly
4. Click **"Save product"**
5. **IMPORTANT:** After saving, click on the product, find the **Price ID** (starts with `price_`) and copy it

#### Pro Plan (£50/month)
1. Click **"+ Add product"**
2. Fill in:
   - **Name:** Pro
   - **Description:** 3 social profiles, 150 scheduled posts/month, Team collaboration (2 users)
3. Price: **50.00 GBP Monthly**
4. Save and copy the **Price ID**

#### Pro Plus Plan (£115/month)
1. Click **"+ Add product"**
2. Fill in:
   - **Name:** Pro Plus
   - **Description:** 5 social profiles, Unlimited posts, Team (5 users), Client approvals
3. Price: **115.00 GBP Monthly**
4. Save and copy the **Price ID**

#### Agency Plan (£288/month)
1. Click **"+ Add product"**
2. Fill in:
   - **Name:** Agency
   - **Description:** 15 social profiles, Unlimited everything, Team (15 users), White label
3. Price: **288.00 GBP Monthly**
4. Save and copy the **Price ID**

#### BrandBolt Plan (£25/month)
1. Click **"+ Add product"**
2. Fill in:
   - **Name:** BrandBolt
   - **Description:** 1 social profile, 30 scheduled posts/month, Basic analytics
3. Price: **25.00 GBP Monthly**
4. Save and copy the **Price ID**

### 2.3 Where to Find Price IDs

After creating each product:
1. Click on the product name to open it
2. Scroll down to the **"Pricing"** section
3. You'll see your price listed with an ID like `price_1QR6abCdEfGhIjKlMnOpQrSt`
4. Click the ID to copy it, or hover over it and click the copy icon

---

## Step 3: Set Up the Webhook

Webhooks allow Stripe to notify your app when payments happen (like successful checkout, subscription cancelled, etc.)

### 3.1 Create Webhook Endpoint

1. In Stripe Dashboard, click **"Developers"** in the left sidebar
2. Click **"Webhooks"**
3. Click **"+ Add endpoint"** button

### 3.2 Configure the Webhook

Fill in the form:

**Endpoint URL:**
- For **local testing**: Use Stripe CLI (see section 3.4 below)
- For **production**: `https://your-domain.com/api/stripe/webhook`
- For **Vercel preview**: `https://your-project.vercel.app/api/stripe/webhook`

**Description:** (optional)
- "Woozy Social subscription webhooks"

**Events to send:**
Click **"Select events"** and check these 5 events:
1. ✅ `checkout.session.completed` - When someone completes payment
2. ✅ `customer.subscription.updated` - When subscription changes (upgrade/downgrade)
3. ✅ `customer.subscription.deleted` - When subscription is cancelled
4. ✅ `invoice.payment_failed` - When payment fails
5. ✅ `invoice.paid` - When invoice is paid (reactivates past_due subscriptions)

Click **"Add endpoint"**

### 3.3 Get the Webhook Signing Secret

After creating the webhook:
1. Click on the webhook endpoint you just created
2. Under **"Signing secret"**, click **"Reveal"**
3. Copy the secret (starts with `whsec_`)
4. This goes in `functions/.env` as `STRIPE_WEBHOOK_SECRET`

### 3.4 Testing Webhooks Locally (Optional)

For local development, you can use the Stripe CLI to forward webhooks to your localhost:

1. **Install Stripe CLI:**
   - Windows: `scoop install stripe` or download from https://stripe.com/docs/stripe-cli
   - Mac: `brew install stripe/stripe-cli/stripe`

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to localhost:**
   ```bash
   stripe listen --forward-to localhost:3001/api/stripe/webhook
   ```

4. The CLI will show you a webhook signing secret (`whsec_...`) - use this for local testing

---

## Step 4: Add Everything to Your .env Files

### 4.1 Update `functions/.env`

Open `c:\Users\mageb\OneDrive\Desktop\woozy\AyrshareAPI_Demo\social-api-demo\functions\.env`

Add these lines at the bottom:

```env
# Stripe Payment Configuration
# =============================================

# Stripe Secret Key (from Step 1)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Stripe Webhook Secret (from Step 3.3)
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE

# Stripe Price IDs (from Step 2)
STRIPE_PRICE_SOLO=price_YOUR_SOLO_PRICE_ID
STRIPE_PRICE_PRO=price_YOUR_PRO_PRICE_ID
STRIPE_PRICE_PRO_PLUS=price_YOUR_PRO_PLUS_PRICE_ID
STRIPE_PRICE_AGENCY=price_YOUR_AGENCY_PRICE_ID
STRIPE_PRICE_BRAND_BOLT=price_YOUR_BRAND_BOLT_PRICE_ID
```

### 4.2 Update Frontend `.env`

Create or update the `.env` file in `c:\Users\mageb\OneDrive\Desktop\woozy\AyrshareAPI_Demo\social-api-demo\.env`

Add this line:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

---

## Step 5: Add to Vercel Environment Variables (For Deployment)

When deploying to Vercel, you need to add these same variables:

1. Go to your project in Vercel Dashboard
2. Click **"Settings"** tab
3. Click **"Environment Variables"** in the left sidebar
4. Add each variable:

| Name | Value | Environment |
|------|-------|-------------|
| `STRIPE_SECRET_KEY` | sk_test_xxx (or sk_live_xxx for production) | All |
| `STRIPE_WEBHOOK_SECRET` | whsec_xxx | All |
| `STRIPE_PRICE_SOLO` | price_xxx | All |
| `STRIPE_PRICE_PRO` | price_xxx | All |
| `STRIPE_PRICE_PRO_PLUS` | price_xxx | All |
| `STRIPE_PRICE_AGENCY` | price_xxx | All |
| `STRIPE_PRICE_BRAND_BOLT` | price_xxx | All |
| `VITE_STRIPE_PUBLISHABLE_KEY` | pk_test_xxx | All |

**Important:** For production, create a separate webhook endpoint pointing to your production URL and use its signing secret.

---

## Step 6: Test the Integration

### 6.1 Start Your App
```bash
cd social-api-demo
npm run dev
```

In another terminal:
```bash
cd social-api-demo/functions
npm run start
```

### 6.2 Test a Payment

1. Go to http://localhost:5173/pricing
2. Click "Get Started" on any plan
3. Use Stripe's test card:
   - **Card number:** 4242 4242 4242 4242
   - **Expiry:** Any future date (e.g., 12/34)
   - **CVC:** Any 3 digits (e.g., 123)
   - **ZIP:** Any 5 digits (e.g., 12345)

4. Complete the checkout
5. You should be redirected to /dashboard with `?payment=success`
6. Check your database - the user should have:
   - `subscription_status` = 'active'
   - `subscription_tier` = the tier they selected
   - `stripe_customer_id` = a Stripe customer ID
   - `stripe_subscription_id` = a Stripe subscription ID

### 6.3 Verify Webhook is Working

If using Stripe CLI for local testing:
- Watch the CLI output - you should see events like `checkout.session.completed`
- Check your server logs for `[WEBHOOK]` messages

---

## Troubleshooting

### "Stripe not configured" error
- Make sure `STRIPE_SECRET_KEY` is set in `functions/.env`
- Restart your backend server after adding the key

### "Price not configured for tier" error
- Make sure all 5 `STRIPE_PRICE_*` variables are set
- Check that the price IDs match what's in your Stripe dashboard

### Webhook signature verification failed
- Make sure `STRIPE_WEBHOOK_SECRET` is correct
- For local testing, use the webhook secret shown by `stripe listen`
- For production, use the secret from the Stripe Dashboard webhook

### Payment succeeds but database not updated
- Check your server logs for `[WEBHOOK]` errors
- Make sure the webhook endpoint is accessible
- Verify the webhook events are selected correctly in Stripe

### User doesn't get Ayrshare profile after payment
- Check that `AYRSHARE_API_KEY` is set correctly
- Check server logs for `ayrshare-profile-create` errors

---

## Summary Checklist

- [ ] Got Stripe API keys (secret + publishable)
- [ ] Created 5 products with monthly prices
- [ ] Copied all 5 price IDs
- [ ] Created webhook endpoint with 5 events selected
- [ ] Copied webhook signing secret
- [ ] Added all variables to `functions/.env`
- [ ] Added publishable key to frontend `.env`
- [ ] Added all variables to Vercel (for deployment)
- [ ] Tested payment flow with test card
- [ ] Verified database updates after payment

---

## Quick Reference: All Environment Variables

### Backend (`functions/.env`)
```env
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_SOLO=price_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_PRO_PLUS=price_xxx
STRIPE_PRICE_AGENCY=price_xxx
STRIPE_PRICE_BRAND_BOLT=price_xxx
```

### Frontend (`.env` in social-api-demo root)
```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
```

---

**Need Help?**
- Stripe Documentation: https://stripe.com/docs
- Stripe Test Cards: https://stripe.com/docs/testing#cards
- Stripe CLI: https://stripe.com/docs/stripe-cli
