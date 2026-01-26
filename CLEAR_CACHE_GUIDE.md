# Clear Cache Endpoint - One-Time Setup

## How to Clear the Stale Cache

### Step 1: Get Your Workspace Profile Key

From your database dump, the Gucci workspace has:
- Profile Key: `5A9AB0CB-FF9B47A1-85A76948-CD839A0E`

### Step 2: Call the Clear Cache Endpoint

**Using curl:**
```bash
curl -X POST https://api.woozysocial.com/api/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"profileKey": "5A9AB0CB-FF9B47A1-85A76948-CD839A0E"}'
```

**Using Postman or Thunder Client:**
- Method: POST
- URL: `https://api.woozysocial.com/api/cache/clear`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "profileKey": "5A9AB0CB-FF9B47A1-85A76948-CD839A0E"
}
```

**Using Browser DevTools Console:**
```javascript
fetch('https://api.woozysocial.com/api/cache/clear', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profileKey: '5A9AB0CB-FF9B47A1-85A76948-CD839A0E'
  })
})
.then(r => r.json())
.then(console.log);
```

### Step 3: Refresh Your Dashboard

After clearing the cache:
1. Refresh your production dashboard
2. The analytics should now show correctly!

## For Other Workspaces

To clear cache for other workspaces, get their `ayr_profile_key` from the database and use the same endpoint.

## Future Use

After this one-time clearing, you won't need to do this again! The automatic cache invalidation will keep everything in sync when you:
- Create new posts
- Update posts
- Approve posts
- Publish scheduled posts

## Why This Was Needed

The old stale cache from before the cache invalidation feature existed. Once cleared, the automatic invalidation system will keep it fresh going forward.
