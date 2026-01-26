const {
  setCors,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError
} = require("../_utils");

let kv;
try {
  kv = require("@vercel/kv").kv;
} catch (e) {
  kv = null;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  if (!kv) {
    return sendError(res, "KV storage not available", ErrorCodes.CONFIG_ERROR);
  }

  try {
    const { profileKey } = req.body || {};

    if (profileKey) {
      // Clear cache for specific profile
      const cacheKey = `ayrshare:history:${profileKey}`;
      await kv.del(cacheKey);
      console.log(`[Cache] Cleared cache for profile: ${profileKey.substring(0, 8)}...`);

      return sendSuccess(res, {
        message: `Cache cleared for profile`,
        profileKey: profileKey.substring(0, 8) + '...'
      });
    } else {
      // Clear all post history caches
      // Note: This requires scanning for keys matching the pattern
      // Vercel KV doesn't have a direct "delete by pattern" command
      // So we'll return instructions for manual clearing
      return sendSuccess(res, {
        message: 'To clear all caches, provide a profileKey parameter',
        hint: 'POST with body: { "profileKey": "YOUR_PROFILE_KEY" }'
      });
    }

  } catch (error) {
    logError('cache.clear.handler', error);
    return sendError(res, "Failed to clear cache", ErrorCodes.INTERNAL_ERROR);
  }
};
