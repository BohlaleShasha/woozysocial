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
    const { userId, workspaceId } = req.body;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!userId || !workspaceId) {
      return res.status(400).json({ error: "userId and workspaceId are required" });
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
      return res.status(403).json({ error: "Only the owner can delete the workspace" });
    }

    // Check how many workspaces the user owns
    const { data: userWorkspaces, error: countError } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .eq('role', 'owner');

    if (countError) {
      console.error("Error counting workspaces:", countError);
      return res.status(500).json({ error: "Failed to verify workspace count" });
    }

    if (userWorkspaces && userWorkspaces.length <= 1) {
      return res.status(400).json({ error: "Cannot delete your only workspace" });
    }

    // Delete workspace members first (foreign key constraint)
    await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId);

    // Delete workspace invitations
    await supabase
      .from('workspace_invitations')
      .delete()
      .eq('workspace_id', workspaceId);

    // Nullify workspace_id on posts (don't delete posts)
    await supabase
      .from('posts')
      .update({ workspace_id: null })
      .eq('workspace_id', workspaceId);

    // Nullify workspace_id on connected accounts
    await supabase
      .from('connected_accounts')
      .update({ workspace_id: null })
      .eq('workspace_id', workspaceId);

    // Delete the workspace
    const { error: deleteError } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (deleteError) {
      console.error("Workspace delete error:", deleteError);
      return res.status(500).json({ error: "Failed to delete workspace" });
    }

    // Update user's last_workspace_id if it was this workspace
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('last_workspace_id')
      .eq('id', userId)
      .single();

    if (userProfile?.last_workspace_id === workspaceId) {
      // Find another workspace to set as active
      const { data: remainingWorkspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', userId)
        .limit(1);

      const newActiveId = remainingWorkspaces?.[0]?.workspace_id || null;

      await supabase
        .from('user_profiles')
        .update({ last_workspace_id: newActiveId })
        .eq('id', userId);
    }

    res.status(200).json({
      success: true,
      message: "Workspace deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting workspace:", error);
    res.status(500).json({ error: "Failed to delete workspace" });
  }
};
