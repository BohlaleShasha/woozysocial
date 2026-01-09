const Stripe = require("stripe");
const { getSupabase, logError } = require("../_utils");

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// Disable body parsing - we need raw body for signature verification
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

// Map Stripe price IDs back to tier names
function getTierFromPriceId(priceId) {
  const priceToTier = {
    [process.env.STRIPE_PRICE_SOLO]: "solo",
    [process.env.STRIPE_PRICE_PRO]: "pro",
    [process.env.STRIPE_PRICE_PRO_PLUS]: "pro-plus",
    [process.env.STRIPE_PRICE_AGENCY]: "agency",
    [process.env.STRIPE_PRICE_BRAND_BOLT]: "brand-bolt",
  };
  return priceToTier[priceId] || "unknown";
}

// Helper to get raw body from request
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      resolve(data);
    });
    req.on("error", reject);
  });
}

// Create Ayrshare profile for user
async function createAyrshareProfile(supabase, userId, tier) {
  try {
    const axios = require("axios");

    // Get user details
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("email, full_name")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      logError("ayrshare-profile-create", userError, { userId });
      return null;
    }

    // Create Ayrshare profile
    const response = await axios.post(
      "https://api.ayrshare.com/api/profiles/profile",
      {
        title: user.full_name || user.email.split("@")[0],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.AYRSHARE_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data && response.data.profileKey) {
      return response.data.profileKey;
    }

    logError("ayrshare-profile-create", "No profileKey in response", {
      userId,
      response: response.data,
    });
    return null;
  } catch (error) {
    logError("ayrshare-profile-create", error, { userId });
    return null;
  }
}

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error("[WEBHOOK] Database not configured");
    return res.status(500).json({ error: "Database not configured" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[WEBHOOK] Webhook secret not configured");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event;

  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers["stripe-signature"];

    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    logError("stripe-webhook-signature", err);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  console.log(`[WEBHOOK] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const tier = session.metadata?.tier;

        if (!userId) {
          console.error("[WEBHOOK] No user ID in session metadata");
          break;
        }

        console.log(`[WEBHOOK] Checkout completed for user ${userId}, tier: ${tier}`);

        // Create Ayrshare profile if needed
        let profileKey = null;
        const { data: existingUser } = await supabase
          .from("user_profiles")
          .select("ayr_profile_key")
          .eq("id", userId)
          .single();

        if (!existingUser?.ayr_profile_key) {
          profileKey = await createAyrshareProfile(supabase, userId, tier);
        }

        // Update user subscription status
        const updateData = {
          subscription_status: "active",
          subscription_tier: tier,
          stripe_subscription_id: session.subscription,
          updated_at: new Date().toISOString(),
        };

        if (profileKey) {
          updateData.ayr_profile_key = profileKey;
          updateData.profile_created_at = new Date().toISOString();
        }

        const { error: updateError } = await supabase
          .from("user_profiles")
          .update(updateData)
          .eq("id", userId);

        if (updateError) {
          logError("stripe-webhook-update", updateError, { userId, event: event.type });
        } else {
          console.log(`[WEBHOOK] User ${userId} subscription activated`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          // Try to find user by customer ID
          const customerId = subscription.customer;
          const { data: user } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("stripe_customer_id", customerId)
            .single();

          if (!user) {
            console.error("[WEBHOOK] Could not find user for subscription update");
            break;
          }

          // Get tier from price ID
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const tier = getTierFromPriceId(priceId);

          const status = subscription.status === "active" ? "active" :
                        subscription.status === "past_due" ? "past_due" :
                        subscription.status === "canceled" ? "cancelled" :
                        subscription.status;

          await supabase
            .from("user_profiles")
            .update({
              subscription_status: status,
              subscription_tier: tier,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          console.log(`[WEBHOOK] Subscription updated for user ${user.id}: ${status}`);
        } else {
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const tier = getTierFromPriceId(priceId);

          const status = subscription.status === "active" ? "active" :
                        subscription.status === "past_due" ? "past_due" :
                        subscription.status === "canceled" ? "cancelled" :
                        subscription.status;

          await supabase
            .from("user_profiles")
            .update({
              subscription_status: status,
              subscription_tier: tier,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          console.log(`[WEBHOOK] Subscription updated for user ${userId}: ${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by customer ID
        const { data: user } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (user) {
          await supabase
            .from("user_profiles")
            .update({
              subscription_status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          console.log(`[WEBHOOK] Subscription cancelled for user ${user.id}`);
        } else {
          console.error("[WEBHOOK] Could not find user for subscription deletion");
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        const { data: user } = await supabase
          .from("user_profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (user) {
          await supabase
            .from("user_profiles")
            .update({
              subscription_status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

          console.log(`[WEBHOOK] Payment failed for user ${user.id}`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        const customerId = invoice.customer;

        // Only process if this is a subscription invoice
        if (invoice.subscription) {
          const { data: user } = await supabase
            .from("user_profiles")
            .select("id, subscription_status")
            .eq("stripe_customer_id", customerId)
            .single();

          if (user && user.subscription_status === "past_due") {
            await supabase
              .from("user_profiles")
              .update({
                subscription_status: "active",
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

            console.log(`[WEBHOOK] Payment received, subscription reactivated for user ${user.id}`);
          }
        }
        break;
      }

      default:
        console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
    }

    // Return 200 to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (error) {
    logError("stripe-webhook-handler", error, { eventType: event.type });
    // Still return 200 to prevent Stripe from retrying
    // Log the error for investigation
    return res.status(200).json({ received: true, error: "Handler error logged" });
  }
};
