import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST" && req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { workspaceId, userId, draftId } = req.body;

    if (!workspaceId || !userId || !draftId) {
      return res.status(400).json({ error: "workspaceId, userId, and draftId are required" });
    }

    // Delete the draft
    const { error } = await supabase
      .from("post_drafts")
      .delete()
      .eq("id", draftId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting draft:", error);
      return res.status(500).json({ error: "Failed to delete draft" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error in drafts/delete:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
