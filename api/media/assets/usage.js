const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID
} = require("../../_utils");

// Storage caps per tier (in bytes)
const STORAGE_CAPS = {
  free: 0,
  solo: 500 * 1024 * 1024,       // 500 MB
  pro: 2 * 1024 * 1024 * 1024,   // 2 GB
  pro_plus: 5 * 1024 * 1024 * 1024, // 5 GB
  agency: 10 * 1024 * 1024 * 1024   // 10 GB
};

/**
 * GET /api/media/assets/usage
 * Returns storage usage and limit for a workspace's asset library
 *
 * Query params:
 * - workspaceId: Required
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
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
    }

    if (!isValidUUID(workspaceId)) {
      return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
    }

    const supabase = getSupabase();

    // Get workspace tier
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .select('subscription_tier')
      .eq('id', workspaceId)
      .single();

    if (wsError) {
      logError('media.assets.usage.workspace', wsError, { workspaceId });
      return sendError(res, "Failed to fetch workspace", ErrorCodes.DATABASE_ERROR);
    }

    const tier = workspace?.subscription_tier || 'free';

    // Get current usage
    const { data: assets, error: usageError } = await supabase
      .from('media_assets')
      .select('file_size')
      .eq('workspace_id', workspaceId);

    if (usageError) {
      logError('media.assets.usage.query', usageError, { workspaceId });
      return sendError(res, "Failed to fetch asset usage", ErrorCodes.DATABASE_ERROR);
    }

    const assetCount = (assets || []).length;
    const totalBytes = (assets || []).reduce((sum, a) => sum + (a.file_size || 0), 0);

    // Handle development/testing tiers
    const effectiveTier = (tier === 'development' || tier === 'testing') ? 'agency' : tier;
    const limitBytes = STORAGE_CAPS[effectiveTier] || STORAGE_CAPS.free;

    return sendSuccess(res, {
      used: totalBytes,
      limit: limitBytes,
      assetCount,
      tierName: tier
    });
  } catch (error) {
    logError('media.assets.usage', error);
    return sendError(res, "Internal server error", ErrorCodes.INTERNAL_ERROR);
  }
};
