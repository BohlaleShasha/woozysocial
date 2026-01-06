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
    const { userId, workspaceId, newName } = req.body;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!userId || !workspaceId || !newName) {
      return res.status(400).json({ error: "userId, workspaceId, and newName are required" });
    }

    // Check if user is owner of this workspace
    const { data: membership, error: membershipError } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .limit(1);

    if (membershipError || !membership || membership.length === 0) {
      return res.status(403).json({ error: "You do not have access to this workspace" });
    }

    if (membership[0].role !== 'owner') {
      return res.status(403).json({ error: "Only the owner can rename the workspace" });
    }

    // Update workspace name
    const { data: workspace, error: updateError } = await supabase
      .from('workspaces')
      .update({ name: newName })
      .eq('id', workspaceId)
      .select()
      .single();

    if (updateError) {
      console.error("Workspace rename error:", updateError);
      return res.status(500).json({ error: "Failed to rename workspace" });
    }

    res.status(200).json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug
      }
    });

  } catch (error) {
    console.error("Error renaming workspace:", error);
    res.status(500).json({ error: "Failed to rename workspace" });
  }
};
