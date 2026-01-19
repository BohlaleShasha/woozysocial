const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  validateRequired,
  isValidEmail,
  logError
} = require("../_utils");

/**
 * Validate if an email is available for registration
 * Used by marketing site during sign-up flow
 * POST /api/signup/validate-email
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

  // Verify API key for security (marketing site should send this)
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_SECRET_KEY) {
    return sendError(
      res,
      "Unauthorized",
      ErrorCodes.AUTH_INVALID
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
    const { email } = req.body;

    // Validate required fields
    const validation = validateRequired(req.body, ["email"]);
    if (!validation.valid) {
      return sendError(
        res,
        `Missing required fields: ${validation.missing.join(", ")}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return sendError(
        res,
        "Invalid email format",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check if email exists in user_profiles
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error) {
      logError("validate-email", error, { email });
      return sendError(
        res,
        "Failed to check email availability",
        ErrorCodes.DATABASE_ERROR
      );
    }

    if (data) {
      return sendSuccess(res, {
        available: false,
        message: "Email already registered"
      });
    }

    return sendSuccess(res, {
      available: true,
      message: "Email is available"
    });

  } catch (error) {
    logError("validate-email", error);
    return sendError(
      res,
      "Failed to validate email",
      ErrorCodes.INTERNAL_ERROR
    );
  }
};
