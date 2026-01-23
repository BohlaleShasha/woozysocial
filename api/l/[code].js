const {
  setCors,
  getSupabase,
  logError
} = require("../_utils");

/**
 * GET /api/l/[code]
 * Redirect handler for short links
 * Tracks clicks and redirects to the original URL
 */
module.exports = async function handler(req, res) {
  // Allow CORS for analytics tracking
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Fallback to error page if database unavailable
    return res.redirect(302, '/');
  }

  try {
    // Extract the short code from the URL
    const code = req.query.code || req.url.split('/l/')[1]?.split('?')[0];

    if (!code) {
      return res.redirect(302, '/');
    }

    // Look up the short link
    const { data: shortLink, error: fetchError } = await supabase
      .from('short_links')
      .select('id, original_url, click_count')
      .eq('short_code', code)
      .single();

    if (fetchError || !shortLink) {
      console.log(`[Short link] Code not found: ${code}`);
      return res.redirect(302, '/');
    }

    // Track the click (non-blocking)
    const trackClick = async () => {
      try {
        // Increment click count
        await supabase
          .from('short_links')
          .update({
            click_count: (shortLink.click_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', shortLink.id);

        // Record detailed click data
        await supabase
          .from('link_clicks')
          .insert({
            short_link_id: shortLink.id,
            ip_address: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null,
            user_agent: req.headers['user-agent'] || null,
            referer: req.headers['referer'] || null
          });
      } catch (error) {
        logError('Track link click', error, { code });
      }
    };

    // Start tracking but don't wait for it
    trackClick();

    // Redirect to the original URL
    return res.redirect(302, shortLink.original_url);

  } catch (error) {
    logError('Short link redirect', error);
    return res.redirect(302, '/');
  }
};
