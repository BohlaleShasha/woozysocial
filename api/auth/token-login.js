const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  validateRequired,
  logError
} = require("../_utils");

/**
 * Validate one-time login token and create session
 * Used after successful payment from marketing site
 * POST /api/auth/token-login
 */
module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return sendError(
      res,
      "Method not allowed",
      ErrorCodes.METHOD_NOT_ALLOWED
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendError(
      res,
      "Database not configured",
      ErrorCodes.CONFIG_ERROR
    );
  }

  try {
    const { token } = req.body;

    // Validate required fields
    const validation = validateRequired(req.body, ["token"]);
    if (!validation.valid) {
      return sendError(
        res,
        `Missing required fields: ${validation.missing.join(", ")}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    console.log("[TOKEN LOGIN] Validating token");

    // Validate token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('login_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.log("[TOKEN LOGIN] Token validation failed:", tokenError?.message || "Token not found");
      return sendError(
        res,
        "Invalid or expired token",
        ErrorCodes.AUTH_INVALID
      );
    }

    console.log("[TOKEN LOGIN] Token valid for user:", tokenData.user_id);

    // Mark token as used
    const { error: updateError } = await supabase
      .from('login_tokens')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('token', token);

    if (updateError) {
      logError("token-login-update", updateError, { token: token.substring(0, 10) });
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', tokenData.user_id)
      .single();

    if (userError || !user) {
      logError("token-login-user", userError, { userId: tokenData.user_id });
      return sendError(
        res,
        "User not found",
        ErrorCodes.NOT_FOUND
      );
    }

    console.log("[TOKEN LOGIN] User found:", user.email);

    // Create Supabase session using admin API
    // Note: This requires service role key
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: process.env.APP_URL || 'http://localhost:5173'
      }
    });

    if (sessionError) {
      logError("token-login-session", sessionError, { userId: user.id });
      return sendError(
        res,
        "Failed to create session",
        ErrorCodes.INTERNAL_ERROR
      );
    }

    console.log("[TOKEN LOGIN] Session created successfully");

    // Return session info to frontend
    // Frontend will use this to set the session
    return sendSuccess(res, {
      message: "Token validated successfully",
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      // Return the magic link properties for the frontend to use
      session: sessionData.properties
    });

  } catch (error) {
    logError("token-login", error);
    return sendError(
      res,
      "Failed to validate token",
      ErrorCodes.INTERNAL_ERROR,
      error.message
    );
  }
};
