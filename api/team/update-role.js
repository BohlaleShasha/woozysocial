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
    const { memberId, newRole, userId } = req.body;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!memberId || !newRole || !userId) {
      return res.status(400).json({ error: "memberId, newRole, and userId are required" });
    }

    const validRoles = ['admin', 'editor', 'view_only'];
    if (!validRoles.includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const { data: member, error } = await supabase
      .from('team_members')
      .select('id, owner_id')
      .eq('id', memberId)
      .single();

    if (error || !member) {
      return res.status(404).json({ error: 'Team member not found' });
    }

    if (member.owner_id !== userId) {
      return res.status(403).json({ error: 'Only the team owner can change roles' });
    }

    await supabase.from('team_members').update({ role: newRole }).eq('id', memberId);

    res.status(200).json({ success: true, newRole });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
};
