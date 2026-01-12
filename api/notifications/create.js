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
 * Create Notification API
 *
 * POST /api/notifications/create
 *
 * Creates one or more notifications for users.
 * Can notify specific users, all workspace members, or members with specific roles.
 *
 * Body:
 * {
 *   type: string (required) - Notification type
 *   title: string (required) - Notification title
 *   message: string (optional) - Notification message
 *   workspaceId: string (optional) - Workspace context
 *   postId: string (optional) - Related post
 *   actorId: string (optional) - User who triggered the notification
 *   metadata: object (optional) - Additional data
 *
 *   // Target specification (one of these):
 *   userId: string - Notify single user
 *   userIds: string[] - Notify multiple specific users
 *   notifyWorkspace: boolean - Notify all workspace members
 *   notifyRoles: string[] - Notify members with these roles
 *   excludeActorId: boolean - Exclude the actor from notifications (default: true)
 * }
 */

// Valid notification types
const VALID_TYPES = [
  // Approval workflow
  'approval_request',
  'post_approved',
  'post_rejected',
  'changes_requested',

  // Workspace/Team
  'workspace_invite',
  'invite_accepted',
  'invite_declined',
  'role_changed',
  'member_joined',
  'member_removed',

  // Posts/Scheduling
  'post_scheduled',
  'post_published',
  'post_failed',
  'post_reminder',

  // Comments
  'new_comment',
  'comment_mention',

  // Social Inbox
  'inbox_message',
  'inbox_mention',

  // General
  'system',
  'info'
];

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
    const {
      type,
      title,
      message,
      workspaceId,
      postId,
      invitationId,
      actorId,
      metadata,
      // Targeting
      userId,
      userIds,
      notifyWorkspace,
      notifyRoles,
      excludeActorId = true
    } = req.body;

    // Validate required fields
    if (!type) {
      return sendError(res, "type is required", ErrorCodes.VALIDATION_ERROR);
    }

    if (!VALID_TYPES.includes(type)) {
      return sendError(res, `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`, ErrorCodes.VALIDATION_ERROR);
    }

    if (!title) {
      return sendError(res, "title is required", ErrorCodes.VALIDATION_ERROR);
    }

    // Validate UUIDs
    if (workspaceId && !isValidUUID(workspaceId)) {
      return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
    }

    if (postId && !isValidUUID(postId)) {
      return sendError(res, "Invalid postId format", ErrorCodes.VALIDATION_ERROR);
    }

    if (actorId && !isValidUUID(actorId)) {
      return sendError(res, "Invalid actorId format", ErrorCodes.VALIDATION_ERROR);
    }

    if (userId && !isValidUUID(userId)) {
      return sendError(res, "Invalid userId format", ErrorCodes.VALIDATION_ERROR);
    }

    // Determine target users
    let targetUserIds = [];

    if (userId) {
      // Single user
      targetUserIds = [userId];
    } else if (userIds && Array.isArray(userIds)) {
      // Multiple specific users
      for (const id of userIds) {
        if (!isValidUUID(id)) {
          return sendError(res, `Invalid user ID format: ${id}`, ErrorCodes.VALIDATION_ERROR);
        }
      }
      targetUserIds = userIds;
    } else if (notifyWorkspace && workspaceId) {
      // All workspace members
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId);

      if (membersError) {
        logError('notifications.create.getMembers', membersError, { workspaceId });
        return sendError(res, "Failed to fetch workspace members", ErrorCodes.DATABASE_ERROR);
      }

      targetUserIds = members?.map(m => m.user_id) || [];
    } else if (notifyRoles && Array.isArray(notifyRoles) && workspaceId) {
      // Members with specific roles
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .in('role', notifyRoles);

      if (membersError) {
        logError('notifications.create.getMembersByRole', membersError, { workspaceId, notifyRoles });
        return sendError(res, "Failed to fetch workspace members", ErrorCodes.DATABASE_ERROR);
      }

      targetUserIds = members?.map(m => m.user_id) || [];
    } else {
      return sendError(res, "Must specify userId, userIds, notifyWorkspace, or notifyRoles", ErrorCodes.VALIDATION_ERROR);
    }

    // Exclude actor if specified
    if (excludeActorId && actorId) {
      targetUserIds = targetUserIds.filter(id => id !== actorId);
    }

    if (targetUserIds.length === 0) {
      return sendSuccess(res, { created: 0, message: "No users to notify" });
    }

    // Create notifications for all target users
    const notifications = targetUserIds.map(targetUserId => ({
      user_id: targetUserId,
      workspace_id: workspaceId || null,
      type,
      title,
      message: message || null,
      post_id: postId || null,
      invitation_id: invitationId || null,
      actor_id: actorId || null,
      metadata: metadata || {},
      read: false
    }));

    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (insertError) {
      logError('notifications.create.insert', insertError, { type, targetUserIds });
      return sendError(res, "Failed to create notifications", ErrorCodes.DATABASE_ERROR);
    }

    return sendSuccess(res, {
      created: insertedNotifications?.length || 0,
      notifications: insertedNotifications
    });

  } catch (error) {
    logError('notifications.create.handler', error);
    return sendError(res, "Failed to create notification", ErrorCodes.INTERNAL_ERROR);
  }
};
