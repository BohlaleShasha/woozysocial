import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { workspaceId, userId, limit = 1 } = req.query;

    if (!workspaceId || !userId) {
      return res.status(400).json({ error: "workspaceId and userId are required" });
    }

    // Fetch drafts for the workspace and user
    const { data: drafts, error } = await supabase
      .from("post_drafts")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error("Error fetching drafts:", error);
      return res.status(500).json({ error: "Failed to fetch drafts" });
    }

    return res.status(200).json({ data: drafts || [] });
  } catch (error) {
    console.error("Error in drafts/list:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
