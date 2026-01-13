# CRITICAL FEATURES - DO NOT MODIFY WITHOUT TESTING

This document lists critical features that are core to the application. Any changes to these features MUST be tested thoroughly before deployment.

## 1. Social Account Connection (CRITICAL - DO NOT BREAK)

### Why This Is Critical
The social account connection feature is the foundation of the entire application. Without it, users cannot:
- Connect their social media accounts
- Post to any platforms
- Use any core functionality

### API Endpoint
**File:** `api/generate-jwt.js`
**Response Format:**
```javascript
{
  success: true,
  data: {
    url: "https://app.ayrshare.com/..." // Ayrshare JWT URL
  }
}
```

### Frontend Components That Use This Feature
1. **SocialAccounts.jsx** (line 121-129)
   - Primary social accounts management page
   - ✅ Correctly handles response: `const url = d.data?.url || d.url;`

2. **TopHeader.jsx** (line 77-80)
   - Connect social accounts from header dropdown
   - ✅ Correctly handles response: `const url = d.data?.url || d.url;`

3. **DashboardContent.jsx** (line 94-121)
   - Connect from dashboard quick actions
   - ✅ Correctly handles response: `const url = data.data?.url || data.url;`
   - ✅ Correctly uses `url` variable in popup blocked fallback

4. **RightSideNav.jsx** (line 103-114)
   - Connect from right sidebar
   - ✅ Correctly handles response: `const url = data.data?.url || data.url;`

### Common Mistakes to Avoid
❌ **WRONG:** `const data = await res.json(); window.open(data.url, ...)`
✅ **CORRECT:** `const data = await res.json(); const url = data.data?.url || data.url; window.open(url, ...)`

### API Response Structure Pattern
All API endpoints using `sendSuccess()` from `api/_utils.js` return:
```javascript
{
  success: true,
  data: {
    // actual response data here
  }
}
```

Therefore, frontend must always access nested data:
- `response.data.url` NOT `response.url`
- `response.data.accounts` NOT `response.accounts`
- `response.data.invitation` NOT `response.invitation`

### Testing Checklist
Before deploying changes that touch social account connection:
- [ ] Test from SocialAccounts page
- [ ] Test from TopHeader dropdown
- [ ] Test from Dashboard
- [ ] Test from RightSideNav
- [ ] Test popup blocked scenario
- [ ] Verify JWT URL is properly extracted
- [ ] Check browser console for errors

### Related Files
- `api/generate-jwt.js` - JWT generation endpoint
- `api/_utils.js` - sendSuccess/sendError helpers
- `src/components/SocialAccounts.jsx`
- `src/components/layout/TopHeader.jsx`
- `src/components/DashboardContent.jsx`
- `src/components/RightSideNav.jsx`

### Environment Variables Required
- `AYRSHARE_API_KEY` - Ayrshare API key
- `AYRSHARE_DOMAIN` - Your Ayrshare domain
- `AYRSHARE_PRIVATE_KEY` - Ayrshare private key (RSA format with \n escaped)
- `AYRSHARE_PROFILE_KEY` - Default profile key (fallback)

---

## 2. Invitation System (CRITICAL)

### Why This Is Critical
Team collaboration depends on invitations working correctly.

### Key Endpoints
- `POST /api/invitations/create` - Create invitation
- `GET /api/invitations/validate?token=xxx` - Validate token
- `POST /api/invitations/accept` - Accept invitation
- `POST /api/invitations/cancel` - Cancel invitation
- `POST /api/invitations/leave` - Leave workspace
- `GET /api/invitations/list` - List pending invitations

### Response Structure
All invitation endpoints return:
```javascript
{
  success: true,
  data: {
    invitation: { ... },
    // or
    invitations: [ ... ]
  }
}
```

### Frontend Components
- `src/pages/AcceptInvite.jsx` - Invitation acceptance page
- `src/components/TeamContent.jsx` - Team management

### Environment Variables
- `APP_URL` - Frontend URL (e.g., https://api.woozysocial.com)
- `RESEND_API_KEY` - Email service API key

### Testing Checklist
- [ ] Create invitation sends email
- [ ] Accept invitation works with correct email
- [ ] Cancel invitation removes from database
- [ ] Leave workspace works (except for owners)
- [ ] Email contains correct invite link with APP_URL

---

## General Rules for API Consumption

### Always Use This Pattern:
```javascript
const response = await fetch('/api/endpoint');
const json = await response.json();

// For single items
const item = json.data?.item || json.item;

// For arrays
const items = json.data?.items || json.items || [];

// For nested objects
const nestedData = json.data?.nested?.value || json.nested?.value;
```

### Never Assume Flat Response Structure
❌ `const { url } = await response.json()`
✅ `const json = await response.json(); const url = json.data?.url || json.url;`

---

*Last Updated: January 13, 2026*
*Maintained by: Development Team*
