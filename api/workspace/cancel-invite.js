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

  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  const supabase = getSupabase();

  if (!supabase) {
    return sendError(res, "Database service is not available", ErrorCodes.CONFIG_ERROR);
  }

  try {
    // Parse body - handle both pre-parsed (Vercel) and raw body
    let body = req.body;
    if (!body || Object.keys(body).length === 0) {
      body = await new Promise((resolve) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve({});
          }
        });
      });
    }

    console.log('cancel-invite received:', JSON.stringify(body));

    const { inviteId, workspaceId, userId } = body;

    // Validate required fields
    if (!inviteId || !userId) {
      return sendError(res, "inviteId and userId are required", ErrorCodes.VALIDATION_ERROR);
    }

    if (!isValidUUID(inviteId) || !isValidUUID(userId)) {
      return sendError(res, "Invalid ID format", ErrorCodes.VALIDATION_ERROR);
    }

    // Get the invitation
    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select('id, workspace_id, status')
      .eq('id', inviteId)
      .single();

    if (inviteError || !invite) {
      console.log('Invitation not found:', { inviteId, error: inviteError });
      return sendError(res, "Invitation not found", ErrorCodes.NOT_FOUND);
    }

    // Check if user has permission (must be owner/admin of workspace)
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return sendError(res, "Not authorized to cancel this invitation", ErrorCodes.FORBIDDEN);
    }

    // Delete the invitation entirely (cleaner than updating status)
    const { error: deleteError } = await supabase
      .from('workspace_invitations')
      .delete()
      .eq('id', inviteId);

    if (deleteError) {
      console.log('Delete failed:', deleteError);
      logError('workspace.cancel-invite.delete', deleteError, { inviteId });
      return sendError(res, "Failed to cancel invitation", ErrorCodes.DATABASE_ERROR);
    }

    console.log('Invitation cancelled successfully:', inviteId);
    return sendSuccess(res, { message: "Invitation cancelled successfully" });

  } catch (error) {
    console.error('cancel-invite error:', error);
    logError('workspace.cancel-invite.handler', error);
    return sendError(res, "Failed to cancel invitation", ErrorCodes.INTERNAL_ERROR);
  }
};
