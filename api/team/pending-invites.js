const { setCors, getSupabase } = require("../_utils");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.query;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const { data: invites, error } = await supabase
      .from('team_invitations')
      .select('*')
      .eq('owner_id', userId)
      .eq('status', 'pending')
      .order('invited_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch pending invites' });
    }

    res.status(200).json({ data: invites || [] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch pending invites' });
  }
};
