const { setCors, sendSuccess, sendError, ErrorCodes } = require("../_utils");

/**
 * Proxy for /api/stripe/create-checkout-session-onboarding
 * Called by the GetStarted wizard (no API key needed from frontend)
 * POST /api/onboarding/create-checkout
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
    const { userId, workspaceId, tier, email, fullName } = req.body;

    if (!userId || !workspaceId) {
      return sendError(
        res,
        "userId and workspaceId are required",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Build success/cancel URLs pointing back to this app
    const origin = `https://${req.headers.host}`;
    const successUrl = `${origin}/get-started/success`;
    const cancelUrl = `${origin}/get-started?step=4&payment=cancelled`;

    const baseUrl = `https://${req.headers.host}`;
    const response = await fetch(
      `${baseUrl}/api/stripe/create-checkout-session-onboarding`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.API_SECRET_KEY,
        },
        body: JSON.stringify({
          userId,
          workspaceId,
          tier,
          email,
          fullName,
          successUrl,
          cancelUrl,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Extract nested data (matches marketing site's routes.js:136 pattern)
    const checkoutData = data.data || data;

    return res.status(200).json({
      checkoutUrl: checkoutData.checkoutUrl,
      sessionId: checkoutData.sessionId,
    });
  } catch (error) {
    console.error("[ONBOARDING/CREATE-CHECKOUT] Error:", error.message);
    return sendError(
      res,
      "Failed to create checkout session",
      ErrorCodes.INTERNAL_ERROR
    );
  }
};
