const { setCors, getSupabase } = require("../_utils");

// Generate URL-friendly slug from name
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now().toString(36);
};

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.body;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // 1. Check if user already has a workspace (use maybeSingle to handle 0 rows)
    const { data: existingMemberships, error: membershipError } = await supabase
      .from('workspace_members')
      .select('workspace_id, workspaces(*)')
      .eq('user_id', userId)
      .limit(1);

    if (membershipError) {
      console.error("Error checking existing membership:", membershipError);
      return res.status(500).json({ error: "Failed to check existing workspaces" });
    }

    if (existingMemberships && existingMemberships.length > 0) {
      // User already has a workspace, return the first one
      const existingMembership = existingMemberships[0];
      return res.status(200).json({
        success: true,
        migrated: false,
        workspace: existingMembership.workspaces
      });
    }

    // 2. Get user's profile to get their Ayrshare profile key
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('full_name, email, ayr_profile_key, ayr_ref_id')
      .eq('id', userId)
      .single();

    // 3. Create default workspace for user
    const workspaceName = userProfile?.full_name
      ? `${userProfile.full_name}'s Business`
      : 'My Business';
    const slug = generateSlug(workspaceName);

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug: slug,
        ayr_profile_key: userProfile?.ayr_profile_key || null,
        ayr_ref_id: userProfile?.ayr_ref_id || null
      })
      .select()
      .single();

    if (workspaceError) {
      console.error("Workspace creation error:", workspaceError);
      return res.status(500).json({ error: "Failed to create workspace" });
    }

    // 4. Add user as owner
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner'
      });

    if (memberError) {
      console.error("Member creation error:", memberError);
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return res.status(500).json({ error: "Failed to add user to workspace" });
    }

    // 5. Migrate existing posts to this workspace
    await supabase
      .from('posts')
      .update({ workspace_id: workspace.id })
      .eq('user_id', userId)
      .is('workspace_id', null);

    // 6. Migrate existing connected accounts to this workspace
    await supabase
      .from('connected_accounts')
      .update({ workspace_id: workspace.id })
      .eq('user_id', userId)
      .is('workspace_id', null);

    // 7. Update user's last_workspace_id
    await supabase
      .from('user_profiles')
      .update({ last_workspace_id: workspace.id })
      .eq('id', userId);

    res.status(200).json({
      success: true,
      migrated: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug
      }
    });

  } catch (error) {
    console.error("Error migrating user:", error);
    res.status(500).json({ error: "Failed to migrate user to workspace" });
  }
};
