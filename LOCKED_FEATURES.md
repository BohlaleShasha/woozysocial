# LOCKED FEATURES - DO NOT MODIFY

These features are working and should NOT be touched unless explicitly requested by the project owner.

## Locked Features

### 1. Approval Workflow Tier Check
- **File**: `api/post/approve.js`
- **Lines**: 136-176
- **Status**: WORKING
- **Description**: Client approval workflow with tier check bypass for client users

### 2. Generate JWT / Social Account Connection
- **File**: `api/generate-jwt.js`
- **Status**: WORKING
- **Description**: Ayrshare JWT generation with workspace profile key lookup

### 3. Brand Profile Query
- **File**: `src/hooks/useQueries.js` (useBrandProfile function)
- **File**: `src/components/BrandProfileContent.jsx`
- **Status**: WORKING
- **Description**: Brand profile fetching and saving using workspace_id

### 4. Favicon and Logo
- **Files**: `public/assets/woozysocial.png`, `public/assets/favicon-32x32.png`
- **File**: `index.html`
- **Status**: WORKING
- **Description**: App logo and favicon

### 5. Post Drafts Auto-Save
- **File**: `src/components/ComposeContent.jsx`
- **Status**: DISABLED (RLS issues)
- **Description**: Auto-save draft functionality - disabled due to Supabase RLS infinite recursion

---

## Rules

1. **DO NOT** modify any code in locked features without explicit request
2. **DO NOT** "improve" or refactor locked code
3. **DO NOT** touch related files that might affect locked features
4. **ALWAYS** ask before making changes that could impact these features

---

*Last updated: January 22, 2026*
