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
    const { token, userId } = req.body;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!token || !userId) {
      return res.status(400).json({ error: "Token and userId are required" });
    }

    const { data: invitation, error: fetchError } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('invite_token', token)
      .single();

    if (fetchError || !invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: `This invitation has already been ${invitation.status}` });
    }

    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (now > expiresAt) {
      await supabase.from('team_invitations').update({ status: 'expired' }).eq('id', invitation.id);
      return res.status(400).json({ error: 'This invitation has expired' });
    }

    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userEmail = userData?.user?.email?.toLowerCase();

    if (!userEmail || userEmail !== invitation.email.toLowerCase()) {
      return res.status(403).json({ error: 'This invitation was sent to a different email address' });
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        owner_id: invitation.owner_id,
        member_id: userId,
        role: invitation.role,
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      return res.status(500).json({ error: 'Failed to add you to the team' });
    }

    await supabase.from('team_invitations').update({ status: 'accepted', accepted_at: new Date().toISOString() }).eq('id', invitation.id);

    res.status(200).json({ message: 'Successfully joined the team!', role: invitation.role });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: "Failed to accept invitation" });
  }
};
