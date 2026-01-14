const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  validateRequired,
  isValidUUID
} = require("../_utils");
const { sendSocialAccountLinkedNotification } = require("../notifications/helpers");

/**
 * API endpoint to trigger notification when a social account is linked
 * Called from frontend after successful account connection
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  const supabase = getSupabase();

  if (!supabase) {
    return sendError(res, "Database service is not available", ErrorCodes.CONFIG_ERROR);
  }

  try {
    const { platform, userId, workspaceId } = req.body;

    // Validate required fields
    const validation = validateRequired(req.body, ['platform', 'userId', 'workspaceId']);
    if (!validation.valid) {
      return sendError(
        res,
        `Missing required fields: ${validation.missing.join(', ')}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    if (!isValidUUID(userId)) {
      return sendError(res, "Invalid userId format", ErrorCodes.VALIDATION_ERROR);
    }

    if (!isValidUUID(workspaceId)) {
      return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
    }

    // Get user's name for notification
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    const userName = userProfile?.full_name || userProfile?.email || 'A team member';

    // Send notification to workspace admins
    await sendSocialAccountLinkedNotification(supabase, {
      workspaceId,
      platform,
      linkedByUserId: userId,
      linkedByName: userName
    });

    return sendSuccess(res, {
      message: `Notification sent for ${platform} connection`
    });

  } catch (error) {
    logError('social.notify-account-linked.handler', error);
    return sendError(res, "Failed to send notification", ErrorCodes.INTERNAL_ERROR);
  }
};
