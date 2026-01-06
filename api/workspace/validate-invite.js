const { setCors, getSupabase } = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Get the invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('workspace_invitations')
      .select(`
        id,
        workspace_id,
        email,
        role,
        status,
        invited_at,
        expires_at,
        workspaces (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('invite_token', token)
      .single();

    if (inviteError || !invitation) {
      return res.status(404).json({ error: "Invitation not found" });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `Invitation has already been ${invitation.status}` });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      // Update status to expired
      await supabase
        .from('workspace_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return res.status(400).json({ error: "Invitation has expired" });
    }

    res.status(200).json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        invited_at: invitation.invited_at,
        expires_at: invitation.expires_at,
        workspace: invitation.workspaces
      }
    });

  } catch (error) {
    console.error("Error validating invitation:", error);
    res.status(500).json({ error: "Failed to validate invitation" });
  }
};
