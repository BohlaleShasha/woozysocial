const axios = require("axios");
const {
  setCors,
  getWorkspaceProfileKey,
  getWorkspaceProfileKeyForUser,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID,
  isServiceConfigured
} = require("./_utils");

const BASE_AYRSHARE = "https://api.ayrshare.com/api";

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  try {
    const { userId, workspaceId } = req.query;

    if (workspaceId && !isValidUUID(workspaceId)) {
      return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
    }

    if (userId && !isValidUUID(userId)) {
      return sendError(res, "Invalid userId format", ErrorCodes.VALIDATION_ERROR);
    }

    // Get profile key - prefer workspaceId if provided, otherwise use userId fallback
    let profileKey;
    if (workspaceId) {
      profileKey = await getWorkspaceProfileKey(workspaceId);
    }
    if (!profileKey && userId) {
      profileKey = await getWorkspaceProfileKeyForUser(userId);
    }

    if (!profileKey) {
      return sendSuccess(res, { history: [] });
    }

    if (!isServiceConfigured('ayrshare')) {
      return sendError(res, "Social media service is not configured", ErrorCodes.CONFIG_ERROR);
    }

    // Fetch from Ayrshare
    let ayrshareHistory = [];
    try {
      const response = await axios.get(`${BASE_AYRSHARE}/history`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
          "Profile-Key": profileKey
        },
        timeout: 30000
      });
      ayrshareHistory = response.data.history || [];
    } catch (axiosError) {
      logError('post-history.ayrshare', axiosError);
      // Continue with empty Ayrshare history instead of failing
    }

    // Fetch posts from Supabase (including pending approval)
    let supabasePosts = [];
    const supabase = getSupabase();

    if (workspaceId && supabase) {
      try {
        const { data: dbPosts, error: dbError } = await supabase
          .from('posts')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (!dbError && dbPosts) {
          supabasePosts = dbPosts.map(post => ({
            id: post.id,
            post: post.caption,
            platforms: post.platforms || [],
            scheduleDate: post.scheduled_at,
            status: post.status === 'pending_approval' ? 'scheduled' : post.status,
            type: post.scheduled_at ? 'schedule' : 'post',
            mediaUrls: post.media_urls || [],
            approval_status: post.approval_status || 'pending',
            requires_approval: post.requires_approval || false,
            comments: [],
            created_at: post.created_at,
            source: 'database',
            ayr_post_id: post.ayr_post_id
          }));
        }
      } catch (dbErr) {
        logError('post-history.supabase', dbErr);
      }
    }

    // Merge: Supabase posts (pending/not in Ayrshare) + Ayrshare history
    const ayrPostIds = new Set(ayrshareHistory.map(p => p.id));
    const pendingPosts = supabasePosts.filter(p =>
      p.approval_status === 'pending' ||
      p.approval_status === 'rejected' ||
      !p.ayr_post_id ||
      !ayrPostIds.has(p.ayr_post_id)
    );

    // Enrich Ayrshare posts with approval status from DB
    const enrichedAyrshare = ayrshareHistory.map(ayrPost => {
      const dbPost = supabasePosts.find(p => p.ayr_post_id === ayrPost.id);
      return {
        ...ayrPost,
        approval_status: dbPost?.approval_status || 'approved',
        requires_approval: dbPost?.requires_approval || false,
        comments: dbPost?.comments || []
      };
    });

    const allHistory = [...pendingPosts, ...enrichedAyrshare];

    return sendSuccess(res, {
      history: allHistory,
      count: allHistory.length
    });

  } catch (error) {
    logError('post-history.handler', error);
    return sendError(res, "Failed to fetch post history", ErrorCodes.INTERNAL_ERROR);
  }
};
