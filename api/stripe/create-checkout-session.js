const Stripe = require("stripe");
const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  validateRequired,
  logError,
  applyRateLimit,
} = require("../_utils");

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Price ID mapping for each tier
const PRICE_IDS = {
  // Free internal tiers (no checkout needed, handled separately)
  "ccs-brand-bolt": null,
  "css-internal": null,
  // Paid tiers
  solo: process.env.STRIPE_PRICE_SOLO,
  pro: process.env.STRIPE_PRICE_PRO,
  "pro-plus": process.env.STRIPE_PRICE_PRO_PLUS,
  agency: process.env.STRIPE_PRICE_AGENCY,
  "brand-bolt": process.env.STRIPE_PRICE_BRAND_BOLT,
};

// Tier display names
const TIER_NAMES = {
  solo: "Solo",
  pro: "Pro",
  "pro-plus": "Pro Plus",
  agency: "Agency",
  "brand-bolt": "BrandBolt",
};

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

  // Rate limit: 5 checkout sessions per minute per user
  const rateLimited = applyRateLimit(req, res, "stripe-checkout", {
    maxRequests: 5,
    windowMs: 60000,
  });
  if (rateLimited) return;

  const supabase = getSupabase();
  if (!supabase) {
    return sendError(
      res,
      "Database not configured",
      ErrorCodes.CONFIG_ERROR
    );
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return sendError(
      res,
      "Stripe not configured",
      ErrorCodes.CONFIG_ERROR
    );
  }

  try {
    const { userId, tier, successUrl, cancelUrl } = req.body;

    // Validate required fields
    const validation = validateRequired(req.body, ["userId", "tier"]);
    if (!validation.valid) {
      return sendError(
        res,
        `Missing required fields: ${validation.missing.join(", ")}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Validate tier
    if (!PRICE_IDS.hasOwnProperty(tier)) {
      return sendError(
        res,
        `Invalid tier: ${tier}. Valid tiers: ${Object.keys(PRICE_IDS).join(", ")}`,
        ErrorCodes.VALIDATION_ERROR
      );
    }

    // Check if it's a free tier
    if (PRICE_IDS[tier] === null) {
      return sendError(
        res,
        "This tier does not require payment. Contact support for access.",
        ErrorCodes.VALIDATION_ERROR
      );
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return sendError(
        res,
        `Price not configured for tier: ${tier}`,
        ErrorCodes.CONFIG_ERROR
      );
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("id, email, full_name, stripe_customer_id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      logError("stripe-checkout", userError, { userId });
      return sendError(res, "User not found", ErrorCodes.NOT_FOUND);
    }

    // Get or create Stripe customer
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name,
        metadata: {
          supabase_user_id: userId,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from("user_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
    }

    // Create checkout session
    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:5173";

    // Debug logging before Stripe API call
    console.log("[STRIPE CHECKOUT] Creating session with:", {
      customerId,
      priceId,
      tier,
      userId,
      appUrl,
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      stripeKeyPrefix: process.env.STRIPE_SECRET_KEY?.substring(0, 7),
      timestamp: new Date().toISOString()
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl || `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${appUrl}/pricing?payment=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          tier: tier,
        },
      },
      metadata: {
        supabase_user_id: userId,
        tier: tier,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_update: {
        address: "auto",
        name: "auto",
      },
    });

    return sendSuccess(res, {
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    // Enhanced error logging with full details
    console.error("[STRIPE CHECKOUT ERROR]", {
      errorType: error.type,
      errorMessage: error.message,
      errorCode: error.code,
      errorParam: error.param,
      statusCode: error.statusCode,
      requestId: error.requestId,
      rawError: error.raw,
      userId,
      tier,
      priceId: PRICE_IDS[tier],
      timestamp: new Date().toISOString()
    });

    logError("stripe-checkout", error, {
      userId,
      tier,
      priceId: PRICE_IDS[tier],
      errorDetails: {
        type: error.type,
        code: error.code,
        param: error.param,
        statusCode: error.statusCode
      }
    });

    // Handle Stripe-specific errors with more details
    if (error.type === "StripeCardError") {
      return sendError(res, error.message, ErrorCodes.VALIDATION_ERROR);
    }

    if (error.type === "StripeInvalidRequestError") {
      return sendError(
        res,
        `Invalid request to payment provider: ${error.message}`,
        ErrorCodes.VALIDATION_ERROR,
        {
          stripeError: error.message,
          param: error.param,
          code: error.code
        }
      );
    }

    return sendError(
      res,
      "Failed to create checkout session",
      ErrorCodes.INTERNAL_ERROR,
      { errorMessage: error.message }
    );
  }
};
