/**
 * DIAGNOSTIC ENDPOINT - Test notification role matching
 * Call this to verify workspace members and their roles
 *
 * Usage: GET /api/notifications/test-roles?workspaceId=YOUR_WORKSPACE_ID
 */

const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID
} = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  const supabase = getSupabase();

  if (!supabase) {
    return sendError(res, "Database service is not available", ErrorCodes.CONFIG_ERROR);
  }

  try {
    const { workspaceId } = req.query;

    if (!workspaceId) {
      return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
    }

    if (!isValidUUID(workspaceId)) {
      return sendError(res, "Invalid workspaceId format", ErrorCodes.VALIDATION_ERROR);
    }

    console.log('[notifications.test-roles] Testing workspace:', workspaceId);

    // Get all workspace members
    const { data: allMembers, error: allError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    console.log('[notifications.test-roles] All members:', allMembers);

    // Test approval request query (owner, admin, client)
    const { data: approvers, error: approversError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .in('role', ['owner', 'admin', 'client']);

    console.log('[notifications.test-roles] Approvers (owner/admin/client):', approvers);

    // Test post scheduled query (owner, admin)
    const { data: scheduledRecipients, error: scheduledError } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId)
      .in('role', ['owner', 'admin']);

    console.log('[notifications.test-roles] Scheduled recipients (owner/admin):', scheduledRecipients);

    // Get user emails for better readability
    const allUserIds = allMembers?.map(m => m.user_id) || [];
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('id', allUserIds);

    const emailMap = {};
    profiles?.forEach(p => {
      emailMap[p.id] = p.email;
    });

    return sendSuccess(res, {
      workspaceId,
      totalMembers: allMembers?.length || 0,
      allMembers: allMembers?.map(m => ({
        user_id: m.user_id,
        role: m.role,
        email: emailMap[m.user_id]
      })),
      approvalRequestRecipients: {
        count: approvers?.length || 0,
        roles: ['owner', 'admin', 'client'],
        members: approvers?.map(m => ({
          user_id: m.user_id,
          role: m.role,
          email: emailMap[m.user_id]
        }))
      },
      postScheduledRecipients: {
        count: scheduledRecipients?.length || 0,
        roles: ['owner', 'admin'],
        members: scheduledRecipients?.map(m => ({
          user_id: m.user_id,
          role: m.role,
          email: emailMap[m.user_id]
        }))
      },
      note: "This shows who would receive notifications based on current code logic"
    });

  } catch (error) {
    logError('notifications.test-roles.handler', error);
    return sendError(res, "Test failed", ErrorCodes.INTERNAL_ERROR);
  }
};
