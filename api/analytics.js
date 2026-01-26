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
 * Analytics API - Fetches engagement metrics and analytics data
 * GET /api/analytics?workspaceId={id}&period={7|30|90}
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
    const { workspaceId, period = "30" } = req.query;

    if (!workspaceId) {
      return sendError(res, "workspaceId is required", ErrorCodes.VALIDATION_ERROR);
    }

    // Get workspace profile key for Ayrshare API
    const profileKey = await getWorkspaceProfileKey(workspaceId);
    if (!profileKey) {
      return sendSuccess(res, {
        summary: { totalPosts: 0, totalEngagements: 0, avgEngagement: 0 },
        platformStats: [],
        dailyStats: [],
        topPosts: [],
        engagementTrend: []
      });
    }

    const apiKey = process.env.AYRSHARE_API_KEY;
    if (!apiKey) {
      return sendError(res, "Ayrshare not configured", ErrorCodes.CONFIG_ERROR);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Fetch post history from Ayrshare
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Profile-Key": profileKey,
    };

    let posts = [];
    try {
      const response = await axios.get(`${AYRSHARE_API}/history`, {
        headers,
        params: {
          lastDays: parseInt(period),
          status: "success"
        },
        timeout: 15000,
      });

      posts = response.data || [];
      if (!Array.isArray(posts)) {
        posts = posts.posts || [];
      }
    } catch (error) {
      console.error("Error fetching Ayrshare history:", error.message);
      posts = [];
    }

    // Process posts into analytics data
    const analytics = processAnalytics(posts, parseInt(period));

    return sendSuccess(res, analytics);

  } catch (error) {
    console.error("Analytics API error:", error);
    return sendError(res, "Failed to fetch analytics", ErrorCodes.INTERNAL_ERROR);
  }
};

/**
 * Process raw posts into analytics metrics
 */
function processAnalytics(posts, periodDays) {
  // Filter posts within the period
  const now = new Date();
  const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

  const filteredPosts = posts.filter(post => {
    const postDate = new Date(post.created || post.publishDate);
    return postDate >= periodStart;
  });

  // Platform breakdown
  const platformMap = {};
  const dailyMap = {};

  filteredPosts.forEach(post => {
    const platforms = post.platforms || [];
    const postDate = new Date(post.created || post.publishDate);
    const dayKey = postDate.toISOString().split('T')[0];

    // Initialize daily entry
    if (!dailyMap[dayKey]) {
      dailyMap[dayKey] = { date: dayKey, posts: 0, engagements: 0 };
    }
    dailyMap[dayKey].posts++;

    // Process each platform result
    platforms.forEach(platform => {
      const platformLower = platform.toLowerCase();

      if (!platformMap[platformLower]) {
        platformMap[platformLower] = {
          platform: platformLower,
          posts: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          impressions: 0,
          engagements: 0
        };
      }

      platformMap[platformLower].posts++;

      // Extract engagement from post analytics if available
      const analytics = post.analytics?.[platformLower] || post[platformLower] || {};
      const likes = analytics.likes || analytics.like_count || 0;
      const comments = analytics.comments || analytics.comment_count || 0;
      const shares = analytics.shares || analytics.share_count || analytics.retweets || 0;
      const impressions = analytics.impressions || analytics.views || 0;

      platformMap[platformLower].likes += likes;
      platformMap[platformLower].comments += comments;
      platformMap[platformLower].shares += shares;
      platformMap[platformLower].impressions += impressions;
      platformMap[platformLower].engagements += likes + comments + shares;

      dailyMap[dayKey].engagements += likes + comments + shares;
    });
  });

  // Convert to arrays and sort
  const platformStats = Object.values(platformMap).sort((a, b) => b.engagements - a.engagements);

  // Fill in missing days for daily stats
  const dailyStats = [];
  for (let i = periodDays - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayKey = date.toISOString().split('T')[0];
    dailyStats.push(dailyMap[dayKey] || { date: dayKey, posts: 0, engagements: 0 });
  }

  // Calculate totals
  const totalPosts = filteredPosts.length;
  const totalEngagements = platformStats.reduce((sum, p) => sum + p.engagements, 0);
  const totalImpressions = platformStats.reduce((sum, p) => sum + p.impressions, 0);
  const avgEngagement = totalPosts > 0 ? Math.round(totalEngagements / totalPosts * 10) / 10 : 0;

  // Get top performing posts
  const topPosts = filteredPosts
    .map(post => {
      let totalEng = 0;
      const platforms = post.platforms || [];
      platforms.forEach(platform => {
        const analytics = post.analytics?.[platform.toLowerCase()] || post[platform.toLowerCase()] || {};
        totalEng += (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0);
      });
      return {
        id: post.id,
        text: (post.post || '').substring(0, 100),
        platforms: post.platforms,
        engagements: totalEng,
        date: post.created || post.publishDate
      };
    })
    .sort((a, b) => b.engagements - a.engagements)
    .slice(0, 5);

  // Calculate engagement trend (compare to previous period)
  const midPoint = Math.floor(dailyStats.length / 2);
  const firstHalf = dailyStats.slice(0, midPoint);
  const secondHalf = dailyStats.slice(midPoint);

  const firstHalfEng = firstHalf.reduce((sum, d) => sum + d.engagements, 0);
  const secondHalfEng = secondHalf.reduce((sum, d) => sum + d.engagements, 0);
  const trendPercent = firstHalfEng > 0
    ? Math.round((secondHalfEng - firstHalfEng) / firstHalfEng * 100)
    : 0;

  return {
    summary: {
      totalPosts,
      totalEngagements,
      totalImpressions,
      avgEngagement,
      trendPercent
    },
    platformStats,
    dailyStats,
    topPosts
  };
}
