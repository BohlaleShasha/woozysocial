const { setCors, getSupabase, parseBody } = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return res.status(500).json({ error: "Database not configured" });
  }

  try {
    const body = await parseBody(req);
    const { inviteToken, userId } = body;

    if (!inviteToken || !userId) {
      return res.status(400).json({ error: "inviteToken and userId are required" });
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
        expires_at,
        workspaces (
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('invite_token', inviteToken)
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

    // Get user's email to verify
    const { data: userData } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single();

    // Verify email matches (case-insensitive)
    if (userData?.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        error: "This invitation was sent to a different email address",
        invitedEmail: invitation.email
      });
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      // Update invitation to accepted
      await supabase
        .from('workspace_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      return res.status(200).json({
        success: true,
        message: "You are already a member of this workspace",
        workspace: invitation.workspaces
      });
    }

    // Add user to workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role
      });

    if (memberError) {
      console.error("Error adding member:", memberError);
      return res.status(500).json({ error: "Failed to add you to the workspace" });
    }

    // Update invitation status
    await supabase
      .from('workspace_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    // Update user's last workspace
    await supabase
      .from('user_profiles')
      .update({ last_workspace_id: invitation.workspace_id })
      .eq('id', userId);

    res.status(200).json({
      success: true,
      message: "Successfully joined the workspace",
      workspace: invitation.workspaces
    });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
};
