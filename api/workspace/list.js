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

    // Get all workspaces for this user
    const { data: memberships, error } = await supabase
      .from('workspace_members')
      .select(`
        role,
        workspace:workspaces(
          id,
          name,
          slug,
          logo_url,
          ayr_profile_key,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error("Error fetching workspaces:", error);
      return res.status(500).json({ error: "Failed to fetch workspaces" });
    }

    // Get user's last workspace preference
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('last_workspace_id')
      .eq('id', userId)
      .single();

    // Transform the data and deduplicate by workspace ID
    const seen = new Set();
    const workspaces = (memberships || [])
      .filter(m => m.workspace)
      .filter(m => {
        if (seen.has(m.workspace.id)) return false;
        seen.add(m.workspace.id);
        return true;
      })
      .map(m => ({
        ...m.workspace,
        membership: { role: m.role }
      }));

    res.status(200).json({
      success: true,
      workspaces: workspaces,
      lastWorkspaceId: userProfile?.last_workspace_id || null
    });

  } catch (error) {
    console.error("Error listing workspaces:", error);
    res.status(500).json({ error: "Failed to list workspaces" });
  }
};
