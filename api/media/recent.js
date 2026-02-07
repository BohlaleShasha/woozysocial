const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID
} = require("../_utils");

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v'];

function getMediaType(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext)) ? 'video' : 'image';
  } catch {
    return 'image';
  }
}

/**
 * GET /api/media/recent
 * Returns deduplicated media URLs from the last 5 days of posts in a workspace
 *
 * Query params:
 * - workspaceId: Required
 * - userId: Required (for auth context)
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  try {
    const { workspaceId, userId } = req.query;

    if (!workspaceId) {
      return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
    }

    if (!isValidUUID(workspaceId)) {
      return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
    }

    const supabase = getSupabase();

    // Get posts from last 5 days with media
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: posts, error } = await supabase
      .from('posts')
      .select('media_urls, created_at')
      .eq('workspace_id', workspaceId)
      .not('media_urls', 'is', null)
      .gte('created_at', fiveDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      logError('media.recent', error, { workspaceId });
      return sendError(res, "Failed to fetch recent media", ErrorCodes.DATABASE_ERROR);
    }

    // Flatten and deduplicate URLs, keeping the most recent usage date
    const urlMap = new Map();

    for (const post of (posts || [])) {
      if (!Array.isArray(post.media_urls)) continue;

      for (const url of post.media_urls) {
        if (!url || typeof url !== 'string') continue;

        // Only keep the most recent usage
        if (!urlMap.has(url)) {
          urlMap.set(url, {
            url,
            type: getMediaType(url),
            usedAt: post.created_at
          });
        }
      }
    }

    // Sort by most recently used
    const media = Array.from(urlMap.values())
      .sort((a, b) => new Date(b.usedAt) - new Date(a.usedAt));

    return sendSuccess(res, { media });
  } catch (error) {
    logError('media.recent', error);
    return sendError(res, "Internal server error", ErrorCodes.INTERNAL_ERROR);
  }
};
