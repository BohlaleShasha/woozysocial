const { setCors, sendSuccess, sendError, ErrorCodes } = require("../_utils");

/**
 * Proxy for /api/signup/create-account
 * Called by the GetStarted wizard (no API key needed from frontend)
 * POST /api/onboarding/create-account
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  try {
    const baseUrl = `https://${req.headers.host}`;
    const response = await fetch(`${baseUrl}/api/signup/create-account`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.API_SECRET_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Extract nested data (matches marketing site's routes.js:68 pattern)
    const responseData = data.data || data;

    return res.status(200).json({
      userId: responseData.userId,
      workspaceId: responseData.workspaceId,
      message: responseData.message || "Account created successfully",
    });
  } catch (error) {
    console.error("[ONBOARDING/CREATE-ACCOUNT] Error:", error.message);
    return sendError(res, "Failed to create account", ErrorCodes.INTERNAL_ERROR);
  }
};
