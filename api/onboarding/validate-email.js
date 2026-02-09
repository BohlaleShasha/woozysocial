const { setCors, sendSuccess, sendError, ErrorCodes } = require("../_utils");

/**
 * Proxy for /api/signup/validate-email
 * Called by the GetStarted wizard (no API key needed from frontend)
 * POST /api/onboarding/validate-email
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
    const response = await fetch(`${baseUrl}/api/signup/validate-email`, {
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

    return res.status(200).json(data);
  } catch (error) {
    console.error("[ONBOARDING/VALIDATE-EMAIL] Error:", error.message);
    return sendError(res, "Failed to validate email", ErrorCodes.INTERNAL_ERROR);
  }
};
