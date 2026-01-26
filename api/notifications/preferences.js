const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID
} = require("../_utils");

/**
 * GET - Fetch user's notification preferences
 * POST - Update user's notification preferences
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const supabase = getSupabase(req);
  if (!supabase) {
    return sendError(res, "Authentication required", ErrorCodes.UNAUTHORIZED);
  }

  // GET - Fetch notification preferences
  if (req.method === "GET") {
    try {
      const { userId } = req.query;

      if (!userId || !isValidUUID(userId)) {
        return sendError(res, "Invalid userId", ErrorCodes.VALIDATION_ERROR);
      }

      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is ok - we'll create defaults
        logError('notifications.preferences.get', error, { userId });
        return sendError(res, "Failed to fetch preferences", ErrorCodes.DATABASE_ERROR);
      }

      // If no preferences exist, return defaults (all enabled)
      if (!preferences) {
        const defaults = {
          user_id: userId,
          email_approval_requests: true,
          email_post_approved: true,
          email_post_rejected: true,
          email_workspace_invites: true,
          email_new_comments: true,
          email_inbox_messages: true,
          app_approval_requests: true,
          app_post_approved: true,
          app_post_rejected: true,
          app_workspace_invites: true,
          app_new_comments: true,
          app_inbox_messages: true
        };

        // Create default preferences
        const { error: insertError } = await supabase
          .from('notification_preferences')
          .insert(defaults);

        if (insertError) {
          logError('notifications.preferences.createDefaults', insertError, { userId });
        }

        return sendSuccess(res, { preferences: defaults });
      }

      return sendSuccess(res, { preferences });

    } catch (error) {
      logError('notifications.preferences.get.handler', error);
      return sendError(res, "Failed to fetch preferences", ErrorCodes.INTERNAL_ERROR);
    }
  }

  // POST - Update notification preferences
  else if (req.method === "POST") {
    try {
      const { userId, preferences } = req.body;

      if (!userId || !isValidUUID(userId)) {
        return sendError(res, "Invalid userId", ErrorCodes.VALIDATION_ERROR);
      }

      if (!preferences || typeof preferences !== 'object') {
        return sendError(res, "Invalid preferences data", ErrorCodes.VALIDATION_ERROR);
      }

      // Only allow updating specific fields
      const allowedFields = [
        'email_approval_requests',
        'email_post_approved',
        'email_post_rejected',
        'email_workspace_invites',
        'email_new_comments',
        'email_inbox_messages',
        'app_approval_requests',
        'app_post_approved',
        'app_post_rejected',
        'app_workspace_invites',
        'app_new_comments',
        'app_inbox_messages'
      ];

      const updates = {};
      for (const field of allowedFields) {
        if (field in preferences) {
          updates[field] = preferences[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return sendError(res, "No valid preferences to update", ErrorCodes.VALIDATION_ERROR);
      }

      // Check if preferences exist
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (!existing) {
        // Create new preferences
        const { data, error } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: userId,
            ...updates
          })
          .select()
          .single();

        if (error) {
          logError('notifications.preferences.create', error, { userId });
          return sendError(res, "Failed to create preferences", ErrorCodes.DATABASE_ERROR);
        }

        return sendSuccess(res, { preferences: data, message: "Preferences created successfully" });
      } else {
        // Update existing preferences
        const { data, error } = await supabase
          .from('notification_preferences')
          .update(updates)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          logError('notifications.preferences.update', error, { userId });
          return sendError(res, "Failed to update preferences", ErrorCodes.DATABASE_ERROR);
        }

        return sendSuccess(res, { preferences: data, message: "Preferences updated successfully" });
      }

    } catch (error) {
      logError('notifications.preferences.post.handler', error);
      return sendError(res, "Failed to update preferences", ErrorCodes.INTERNAL_ERROR);
    }
  }

  else {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }
};
