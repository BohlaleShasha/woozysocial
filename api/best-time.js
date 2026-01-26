const axios = require("axios");
const {
  getSupabase,
  getWorkspaceProfileKey,
  setCors,
  sendSuccess,
  sendError,
  ErrorCodes,
} = require("./_utils");

const AYRSHARE_API = "https://api.ayrshare.com/api";

/**
 * Best Time to Post API - AI-powered recommendations based on historical performance
 * GET /api/best-time?workspaceId={id}&platform={platform}
 */
module.exports = async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  try {
    const { workspaceId, platform } = req.query;

    if (!workspaceId) {
      return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
    }

    // Get workspace profile key for Ayrshare API
    const profileKey = await getWorkspaceProfileKey(workspaceId);

    // Default best times based on industry research
    const defaultBestTimes = getDefaultBestTimes(platform);

    if (!profileKey) {
      return sendSuccess(res, {
        recommendations: defaultBestTimes,
        source: "industry_default",
        message: "Based on industry averages. Connect social accounts for personalized insights."
      });
    }

    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) {
      return sendSuccess(res, {
        recommendations: defaultBestTimes,
        source: "industry_default"
      });
    }

    // Fetch post history to analyze engagement patterns
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Profile-Key": profileKey,
    };

    let posts = [];
    try {
      const response = await axios.get(`${AYRSHARE_API}/history`, {
        headers,
        params: {
          lastDays: 90,
          status: "success"
        },
        timeout: 15000,
      });

      posts = response.data || [];
      if (!Array.isArray(posts)) {
        posts = posts.posts || [];
      }
    } catch (error) {
      console.error("Error fetching history for best time analysis:", error.message);
    }

    // If not enough data, return defaults
    if (posts.length < 10) {
      return sendSuccess(res, {
        recommendations: defaultBestTimes,
        source: "industry_default",
        message: "Not enough posting history. Showing industry best practices."
      });
    }

    // Analyze posting patterns and engagement
    const analysis = analyzePostingPatterns(posts, platform);

    return sendSuccess(res, {
      recommendations: analysis.bestTimes,
      source: "personalized",
      stats: {
        postsAnalyzed: posts.length,
        avgEngagement: analysis.avgEngagement,
        peakDay: analysis.peakDay,
        peakHour: analysis.peakHour
      }
    });

  } catch (error) {
    console.error("Best Time API error:", error);
    return sendError(res, "Failed to analyze best times", ErrorCodes.INTERNAL_ERROR);
  }
};

/**
 * Get default best times based on industry research
 */
function getDefaultBestTimes(platform) {
  const platformDefaults = {
    twitter: [
      { day: "Tuesday", time: "9:00 AM", score: 95 },
      { day: "Wednesday", time: "9:00 AM", score: 93 },
      { day: "Thursday", time: "9:00 AM", score: 90 },
      { day: "Tuesday", time: "12:00 PM", score: 88 },
      { day: "Wednesday", time: "12:00 PM", score: 85 }
    ],
    instagram: [
      { day: "Tuesday", time: "11:00 AM", score: 95 },
      { day: "Wednesday", time: "11:00 AM", score: 93 },
      { day: "Friday", time: "10:00 AM", score: 90 },
      { day: "Thursday", time: "2:00 PM", score: 88 },
      { day: "Monday", time: "11:00 AM", score: 85 }
    ],
    facebook: [
      { day: "Wednesday", time: "11:00 AM", score: 95 },
      { day: "Tuesday", time: "1:00 PM", score: 93 },
      { day: "Thursday", time: "2:00 PM", score: 90 },
      { day: "Friday", time: "9:00 AM", score: 88 },
      { day: "Monday", time: "9:00 AM", score: 85 }
    ],
    linkedin: [
      { day: "Tuesday", time: "10:00 AM", score: 95 },
      { day: "Wednesday", time: "12:00 PM", score: 93 },
      { day: "Thursday", time: "9:00 AM", score: 90 },
      { day: "Tuesday", time: "8:00 AM", score: 88 },
      { day: "Wednesday", time: "8:00 AM", score: 85 }
    ],
    tiktok: [
      { day: "Tuesday", time: "7:00 PM", score: 95 },
      { day: "Thursday", time: "7:00 PM", score: 93 },
      { day: "Friday", time: "5:00 PM", score: 90 },
      { day: "Saturday", time: "11:00 AM", score: 88 },
      { day: "Sunday", time: "4:00 PM", score: 85 }
    ],
    pinterest: [
      { day: "Friday", time: "3:00 PM", score: 95 },
      { day: "Saturday", time: "8:00 PM", score: 93 },
      { day: "Sunday", time: "8:00 PM", score: 90 },
      { day: "Thursday", time: "3:00 PM", score: 88 },
      { day: "Tuesday", time: "3:00 PM", score: 85 }
    ]
  };

  // General best times if no platform specified
  const generalDefaults = [
    { day: "Tuesday", time: "10:00 AM", score: 95 },
    { day: "Wednesday", time: "11:00 AM", score: 93 },
    { day: "Thursday", time: "10:00 AM", score: 90 },
    { day: "Tuesday", time: "2:00 PM", score: 88 },
    { day: "Wednesday", time: "2:00 PM", score: 85 }
  ];

  if (platform) {
    return platformDefaults[platform.toLowerCase()] || generalDefaults;
  }

  return generalDefaults;
}

/**
 * Analyze posting patterns from historical data
 */
function analyzePostingPatterns(posts, targetPlatform) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Track engagement by day/hour
  const engagementBySlot = {};
  let totalEngagement = 0;
  let engagementCount = 0;

  posts.forEach(post => {
    const postDate = new Date(post.created || post.publishDate);
    const day = dayNames[postDate.getDay()];
    const hour = postDate.getHours();

    // Filter by platform if specified
    const platforms = post.platforms || [];
    if (targetPlatform && !platforms.some(p => p.toLowerCase() === targetPlatform.toLowerCase())) {
      return;
    }

    // Calculate engagement
    let engagement = 0;
    platforms.forEach(platform => {
      const analytics = post.analytics?.[platform.toLowerCase()] || post[platform.toLowerCase()] || {};
      engagement += (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0);
    });

    const slotKey = `${day}-${hour}`;
    if (!engagementBySlot[slotKey]) {
      engagementBySlot[slotKey] = { day, hour, totalEngagement: 0, postCount: 0 };
    }
    engagementBySlot[slotKey].totalEngagement += engagement;
    engagementBySlot[slotKey].postCount++;

    totalEngagement += engagement;
    engagementCount++;
  });

  // Calculate average engagement per slot
  const slots = Object.values(engagementBySlot).map(slot => ({
    ...slot,
    avgEngagement: slot.postCount > 0 ? slot.totalEngagement / slot.postCount : 0
  }));

  // Sort by average engagement
  slots.sort((a, b) => b.avgEngagement - a.avgEngagement);

  // Format top 5 as recommendations
  const bestTimes = slots.slice(0, 5).map((slot, index) => {
    const timeStr = formatHour(slot.hour);
    const score = 95 - (index * 5);
    return {
      day: slot.day,
      time: timeStr,
      score,
      avgEngagement: Math.round(slot.avgEngagement * 10) / 10
    };
  });

  // Find peak day and hour
  const peakSlot = slots[0] || { day: 'Tuesday', hour: 10 };
  const avgEngagement = engagementCount > 0 ? Math.round(totalEngagement / engagementCount * 10) / 10 : 0;

  return {
    bestTimes: bestTimes.length > 0 ? bestTimes : getDefaultBestTimes(targetPlatform),
    avgEngagement,
    peakDay: peakSlot.day,
    peakHour: formatHour(peakSlot.hour)
  };
}

/**
 * Format hour as readable time string
 */
function formatHour(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}
