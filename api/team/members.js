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

    const { data: members, error } = await supabase
      .from('team_members')
      .select('id, owner_id, member_id, role, created_at, joined_at')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch team members' });
    }

    const memberIds = (members || []).map((m) => m.member_id);
    let profilesById = {};

    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', memberIds);

      profilesById = (profiles || []).reduce((acc, p) => {
        acc[p.id] = p;
        return acc;
      }, {});
    }

    const enrichedMembers = (members || []).map((m) => ({
      ...m,
      profile: profilesById[m.member_id] || null,
    }));

    res.status(200).json({ data: enrichedMembers });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
};
