const { setCors, getSupabase } = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { inviteId, userId } = req.body;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!inviteId || !userId) {
      return res.status(400).json({ error: "inviteId and userId are required" });
    }

    // Get the invitation from workspace_invitations
    const { data: invite, error } = await supabase
      .from('workspace_invitations')
      .select('id, workspace_id, status')
      .eq('id', inviteId)
      .single();

    if (error || !invite) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    // Check if user has permission to cancel (must be owner/admin of workspace)
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', invite.workspace_id)
      .eq('user_id', userId)
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Not authorized to cancel this invitation' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Only pending invitations can be cancelled' });
    }

    await supabase.from('workspace_invitations').update({ status: 'cancelled' }).eq('id', inviteId);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
};
