const { Resend } = require("resend");
const { setCors, getSupabase } = require("./_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, role, userId } = req.body;
    const supabase = getSupabase();
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!email || !role || !userId) {
      return res.status(400).json({ error: "Email, role, and userId are required" });
    }

    const validRoles = ['admin', 'editor', 'view_only'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('owner_id', userId)
      .eq('email', email.toLowerCase())
      .single();

    if (existingMember) {
      return res.status(400).json({ error: 'This user is already a team member' });
    }

    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        owner_id: userId,
        email: email.toLowerCase(),
        role: role,
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      return res.status(500).json({ error: 'Failed to create invitation' });
    }

    if (resend) {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const inviterName = userData?.user?.email || 'A team member';
      const appUrl = process.env.APP_URL || 'https://woozysocial.com';
      const inviteLink = `${appUrl}/accept-invite?token=${invitation.invite_token}`;

      try {
        await resend.emails.send({
          from: 'Social Media Team <hello@woozysocial.com>',
          to: [email],
          subject: `${inviterName} invited you to join their team`,
          html: `<p>You've been invited to join a team. <a href="${inviteLink}">Click here to accept</a></p>`
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
    }

    res.status(200).json({ success: true, invitation });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to send invitation" });
  }
};
