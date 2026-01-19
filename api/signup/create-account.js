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
 * Create a new user account and workspace (pending payment)
 * Used by marketing site during sign-up flow
 * POST /api/signup/create-account
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

  // Verify API key for security
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
    const {
      fullName,
      email,
      password,
      workspaceName,
      questionnaireAnswers,
      selectedTier
    } = req.body;

    // Validate required fields
    const validation = validateRequired(req.body, [
      "fullName",
      "email",
      "password",
      "workspaceName",
      "selectedTier"
    ]);

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

    // Validate password length
    if (password.length < 8) {
      return sendError(
        res,
        "Password must be at least 8 characters",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    console.log("[CREATE ACCOUNT] Starting account creation for:", email);

    // STEP 1: Create Supabase auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      logError("create-account-auth", authError, { email });

      // Handle specific auth errors
      if (authError.message?.includes("already registered")) {
        return sendError(
          res,
          "Email already registered",
          ErrorCodes.VALIDATION_ERROR
        );
      }

      return sendError(
        res,
        authError.message || "Failed to create account",
        ErrorCodes.INTERNAL_ERROR
      );
    }

    const userId = authData.user.id;
    console.log("[CREATE ACCOUNT] Auth user created:", userId);

    // STEP 2: Create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: email.toLowerCase(),
        full_name: fullName,
        questionnaire_answers: questionnaireAnswers || {},
        onboarding_step: 4, // At payment step
        onboarding_completed: false
      })
      .select()
      .single();

    if (profileError) {
      logError("create-account-profile", profileError, { userId, email });

      // Cleanup: delete auth user if profile creation failed
      await supabase.auth.admin.deleteUser(userId);

      return sendError(
        res,
        "Failed to create user profile",
        ErrorCodes.DATABASE_ERROR
      );
    }

    console.log("[CREATE ACCOUNT] User profile created");

    // STEP 3: Create workspace (pending payment)
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .insert({
        name: workspaceName,
        owner_id: userId,
        onboarding_status: 'pending_payment',
        questionnaire_data: questionnaireAnswers || {},
        subscription_tier: selectedTier,
        subscription_status: 'inactive'
      })
      .select()
      .single();

    if (workspaceError) {
      logError("create-account-workspace", workspaceError, { userId, email });

      // Cleanup: delete profile and auth user
      await supabase.from('user_profiles').delete().eq('id', userId);
      await supabase.auth.admin.deleteUser(userId);

      return sendError(
        res,
        "Failed to create workspace",
        ErrorCodes.DATABASE_ERROR
      );
    }

    console.log("[CREATE ACCOUNT] Workspace created:", workspace.id);

    // STEP 4: Add user as workspace owner in workspace_members
    const { error: memberError } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: userId,
        role: 'owner'
      });

    if (memberError) {
      logError("create-account-member", memberError, { userId, workspaceId: workspace.id });
      // Don't fail the whole process for this
      console.warn("[CREATE ACCOUNT] Failed to add workspace member, will retry later");
    }

    console.log("[CREATE ACCOUNT] Account creation completed successfully");

    return sendSuccess(res, {
      userId: userId,
      workspaceId: workspace.id,
      message: "Account created successfully"
    });

  } catch (error) {
    logError("create-account", error);
    return sendError(
      res,
      "Failed to create account",
      ErrorCodes.INTERNAL_ERROR,
      error.message
    );
  }
};
