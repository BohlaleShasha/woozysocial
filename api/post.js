const axios = require("axios");
const { setCors, getUserProfileKey, getWorkspaceProfileKey } = require("./_utils");

const BASE_AYRSHARE = "https://api.ayrshare.com/api";

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, networks, scheduledDate, userId, workspaceId, mediaUrl } = req.body;

    let profileKey = process.env.AYRSHARE_PROFILE_KEY;
    if (workspaceId) {
      const workspaceProfileKey = await getWorkspaceProfileKey(workspaceId);
      if (workspaceProfileKey) profileKey = workspaceProfileKey;
    } else if (userId) {
      const userProfileKey = await getUserProfileKey(userId);
      if (userProfileKey) profileKey = userProfileKey;
    }

    const platforms = Object.entries(JSON.parse(networks))
      .filter(([, value]) => value)
      .map(([key]) => key);

    const postData = { post: text, platforms };

    if (scheduledDate) {
      const dateObj = new Date(scheduledDate);
      const timestampSeconds = Math.floor(dateObj.getTime() / 1000);
      postData.scheduleDate = timestampSeconds;
    }

    if (mediaUrl) {
      postData.mediaUrls = [mediaUrl];
    }

    const response = await axios.post(`${BASE_AYRSHARE}/post`, postData, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
        "Profile-Key": profileKey
      }
    });

    if (response.data.status === 'error') {
      return res.status(400).json({ error: "Post failed", details: response.data });
    }

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error("Error posting:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to post", details: error.response?.data || error.message });
  }
};
