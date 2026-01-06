const axios = require("axios");
const fs = require("fs");
const { setCors, getSupabase } = require("../_utils");

const BASE_AYRSHARE = "https://api.ayrshare.com/api";

// Helper to read private key
const readPrivateKey = async (privateKeyPath) => {
  try {
    let privateKey = fs.readFileSync(privateKeyPath, { encoding: "utf8" });
    privateKey = privateKey.replace(/\\n/g, '\n');
    return privateKey.replace(/^\s+|\s+$/g, '');
  } catch (error) {
    console.error("Error reading private key:", error);
    return null;
  }
};

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
    const { userId, businessName } = req.body;
    const supabase = getSupabase();

    if (!supabase) {
      return res.status(500).json({ error: "Database not configured" });
    }

    if (!userId || !businessName) {
      return res.status(400).json({ error: "userId and businessName are required" });
    }

    // 1. Create new Ayrshare profile for this business
    let ayrProfileKey = null;
    let ayrRefId = null;

    if (process.env.AYRSHARE_API_KEY && process.env.AYRSHARE_PRIVATE_KEY) {
      const privateKey = await readPrivateKey(process.env.AYRSHARE_PRIVATE_KEY);

      if (privateKey) {
        try {
          const profileResponse = await axios.post(
            `${BASE_AYRSHARE}/profiles/profile`,
            {
              title: businessName,
              privateKey: privateKey
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`
              }
            }
          );

          ayrProfileKey = profileResponse.data.profileKey;
          ayrRefId = profileResponse.data.refId;
          console.log("Created Ayrshare profile:", { ayrProfileKey, ayrRefId });
        } catch (ayrError) {
          console.error("Ayrshare profile creation error:", ayrError.response?.data || ayrError.message);
          // Continue without Ayrshare - user can link later
        }
      }
    }

    // 2. Create workspace in database
    const slug = generateSlug(businessName);

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: businessName,
        slug: slug,
        ayr_profile_key: ayrProfileKey,
        ayr_ref_id: ayrRefId
      })
      .select()
      .single();

    if (workspaceError) {
      console.error("Workspace creation error:", workspaceError);
      return res.status(500).json({ error: "Failed to create workspace" });
    }

    // 3. Add user as owner of the workspace
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner'
      });

    if (memberError) {
      console.error("Member creation error:", memberError);
      // Try to clean up the workspace
      await supabase.from('workspaces').delete().eq('id', workspace.id);
      return res.status(500).json({ error: "Failed to add user to workspace" });
    }

    // 4. Update user's last_workspace_id
    await supabase
      .from('user_profiles')
      .update({ last_workspace_id: workspace.id })
      .eq('id', userId);

    res.status(200).json({
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        ayr_profile_key: workspace.ayr_profile_key
      }
    });

  } catch (error) {
    console.error("Error creating workspace:", error);
    res.status(500).json({ error: "Failed to create workspace" });
  }
};
