const axios = require("axios");
const {
  setCors,
  getWorkspaceProfileKey,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError
} = require("./_utils");

const BASE_AYRSHARE = "https://api.ayrshare.com/api";

/**
 * POST /api/sync-all-analytics
 * Syncs analytics from Ayrshare for ALL posted posts in a workspace
 * This should be run once to populate the database with analytics
 *
 * Body:
 * - workspaceId: Required workspace ID
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  try {
    const { workspaceId } = req.body || {};

    if (!workspaceId) {
      return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
    }

    const supabase = getSupabase();
    if (!supabase) {
      return sendError(res, "Database service unavailable", ErrorCodes.CONFIG_ERROR);
    }

    // Get profile key
    const profileKey = await getWorkspaceProfileKey(workspaceId);
    if (!profileKey) {
      return sendError(res, "No Ayrshare profile found for this workspace", ErrorCodes.VALIDATION_ERROR);
    }

    // Get all posted posts with ayr_post_id
    const { data: posts, error: fetchError } = await supabase
      .from('posts')
      .select('id, ayr_post_id, platforms, caption, analytics, analytics_updated_at')
      .eq('workspace_id', workspaceId)
      .eq('status', 'posted')
      .not('ayr_post_id', 'is', null)
      .order('posted_at', { ascending: false });

    if (fetchError) {
      console.error('[SYNC-ALL] Database error:', fetchError);
      return sendError(res, "Failed to fetch posts", ErrorCodes.INTERNAL_ERROR);
    }

    if (!posts || posts.length === 0) {
      return sendSuccess(res, {
        synced: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        message: "No posts found to sync"
      });
    }

    console.log(`[SYNC-ALL] Found ${posts.length} posts to sync`);

    let syncedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Sync analytics for each post
    for (const post of posts) {
      try {
        // Check if analytics were recently updated (within last hour)
        if (post.analytics_updated_at) {
          const lastUpdate = new Date(post.analytics_updated_at);
          const now = new Date();
          const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);

          if (hoursSinceUpdate < 1 && post.analytics && Object.keys(post.analytics).length > 0) {
            console.log(`[SYNC-ALL] Skipping ${post.ayr_post_id} (updated ${Math.round(hoursSinceUpdate * 60)}min ago)`);
            skippedCount++;
            continue;
          }
        }

        console.log(`[SYNC-ALL] Fetching analytics for ${post.ayr_post_id}...`);

        // Fetch analytics from Ayrshare using POST with JSON body
        const response = await axios.post(
          `${BASE_AYRSHARE}/analytics/post`,
          {
            id: post.ayr_post_id,
            platforms: post.platforms || []
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
              "Profile-Key": profileKey
            },
            timeout: 30000
          }
        );

        if (response.data) {
          // Store analytics in posts.analytics JSONB column
          const { error: updateError } = await supabase
            .from('posts')
            .update({
              analytics: response.data,
              analytics_updated_at: new Date().toISOString()
            })
            .eq('id', post.id);

          if (updateError) {
            console.error(`[SYNC-ALL] Error updating post ${post.ayr_post_id}:`, updateError);
            failedCount++;
            errors.push({ postId: post.ayr_post_id, error: updateError.message });
          } else {
            console.log(`[SYNC-ALL] ✓ Synced analytics for ${post.ayr_post_id}`);
            syncedCount++;
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (ayrshareError) {
        const status = ayrshareError.response?.status;
        const errorMsg = ayrshareError.response?.data?.message || ayrshareError.message;

        // If post not found or no analytics, skip
        if (status === 404) {
          console.log(`[SYNC-ALL] No analytics found for post ${post.ayr_post_id}`);
          skippedCount++;
        } else {
          console.error(`[SYNC-ALL] Error fetching analytics for post ${post.ayr_post_id}:`, errorMsg);
          failedCount++;
          errors.push({ postId: post.ayr_post_id, error: errorMsg });
        }
      }
    }

    console.log(`[SYNC-ALL] Sync complete: ${syncedCount} synced, ${skippedCount} skipped, ${failedCount} failed`);

    return sendSuccess(res, {
      synced: syncedCount,
      failed: failedCount,
      skipped: skippedCount,
      total: posts.length,
      message: `Synced analytics for ${syncedCount} posts`,
      errors: errors.slice(0, 5) // Return first 5 errors for debugging
    });

  } catch (error) {
    logError('sync-all-analytics.handler', error);
    return sendError(res, "Failed to sync analytics", ErrorCodes.INTERNAL_ERROR);
  }
};
