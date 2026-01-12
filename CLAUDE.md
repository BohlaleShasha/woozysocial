# Woozy Social - Project Context for Claude Code

> **IMPORTANT**: This file is read by Claude Code. Keep updated when making architectural decisions.

## Project Overview
Woozy Social is a social media management platform built by Creative Crew Studio. White-label solution for managing client social media accounts with integrated subscription billing.

## Tech Stack
- **Frontend**: React + Vite + Chakra UI
- **Backend**: Node.js/Express (local) + Vercel Serverless (production)
- **Database**: Supabase (PostgreSQL)
- **API Integrations**:
  - **Ayrshare** - Social media posting, scheduling, analytics
  - **Stripe** - Payments, subscriptions, customer portal

---

## CRITICAL - DO NOT MODIFY WITHOUT DISCUSSION

### Protected Files
- `functions/.env` - Environment variables
- `api/_utils.js` - Shared API utilities
- `api/stripe/webhook.js` - Stripe webhook handler
- Any file containing API keys or secrets

### Key Architecture
- **Local dev**: `functions/server.js` on port 3001
- **Production**: `api/` folder deployed to Vercel serverless
- **Database**: Supabase with Row Level Security (RLS)
- **Multi-workspace**: Each workspace has its own `ayr_profile_key`

---

## Current Development Focus

### Developer 1: Bohlale Shasha
- Branch: `main`
- Working on:
  - Schedule/posting functionality
  - Social media connection flow
  - Client approval workflow

### Developer 2: [Name]
- Branch: `testBranch`
- Working on:
  - Team management
  - Security
  - Notifications

---

## Key Files

### Frontend
| File | Purpose |
|------|---------|
| `src/components/ComposeContent.jsx` | Post creation/scheduling UI |
| `src/components/ScheduleContent.jsx` | Schedule view |
| `src/components/SocialAccounts.jsx` | Connect social accounts |
| `src/components/DashboardContent.jsx` | Main dashboard |
| `src/components/TeamContent.jsx` | Team management |
| `src/contexts/AuthContext.jsx` | Authentication state |
| `src/contexts/WorkspaceContext.jsx` | Workspace state |

### Backend (Vercel - Production)
| File | Purpose |
|------|---------|
| `api/post.js` | Create/schedule posts |
| `api/post-history.js` | Get post history |
| `api/generate-jwt.js` | Generate Ayrshare connect URL |
| `api/user-accounts.js` | Get connected accounts |
| `api/_utils.js` | Shared utilities |

### Backend (Local Dev)
| File | Purpose |
|------|---------|
| `functions/server.js` | Express server (port 3001) |

---

## Ayrshare API Quick Reference

```
Base URL: https://api.ayrshare.com/api
Auth: Authorization: Bearer {AYRSHARE_API_KEY}
Profile: Profile-Key: {workspace.ayr_profile_key}
```

### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/post` | POST | Create/schedule posts |
| `/history` | GET | Get post history |
| `/profiles/generateJWT` | POST | Get SSO connect URL |
| `/user` | GET | Get connected accounts |

### Post Format
```javascript
{
  post: "Content here",
  platforms: ["facebook", "instagram"],
  scheduleDate: "2026-01-15T14:00:00Z"  // ISO 8601
}
```

---

## Environment Variables Required

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Ayrshare
AYRSHARE_API_KEY=
AYRSHARE_PRIVATE_KEY=
AYRSHARE_DOMAIN=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Known Issues / Current Work
- Scheduling posts on Vercel (FormData parsing with busboy)
- Social account connection flow
- Client approval workflow for scheduled posts

---

## Claude Code Instructions

### Rules
1. Check this file first for context
2. Don't modify protected files without asking
3. Test locally before pushing
4. Keep `functions/server.js` and `api/` in sync

### Patterns
- API responses: `{ success: true, data: {...} }` or `{ success: false, error: "..." }`
- Use `baseURL` from constants for API calls
- FormData for file uploads, JSON for text-only
- Always include error handling with toast notifications

### Hard Rules
- NEVER hardcode API keys
- NEVER push directly to main without testing
- ALWAYS use Profile-Key header for Ayrshare calls
- ALWAYS handle errors gracefully with user feedback
