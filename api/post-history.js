const axios = require("axios");
const { setCors, getUserProfileKey, getWorkspaceProfileKey } = require("./_utils");

const BASE_AYRSHARE = "https://api.ayrshare.com/api";

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId, workspaceId } = req.query;

    let profileKey = process.env.AYRSHARE_PROFILE_KEY;
    if (workspaceId) {
      const workspaceProfileKey = await getWorkspaceProfileKey(workspaceId);
      if (workspaceProfileKey) profileKey = workspaceProfileKey;
    } else if (userId) {
      const userProfileKey = await getUserProfileKey(userId);
      if (userProfileKey) profileKey = userProfileKey;
    }

    const response = await axios.get(`${BASE_AYRSHARE}/history`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
        "Profile-Key": profileKey
      }
    });

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error fetching post history:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch post history" });
  }
};
