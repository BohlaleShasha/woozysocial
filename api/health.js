const { setCors } = require("./_utils");

module.exports = function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const envStatus = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    AYRSHARE_API_KEY: !!process.env.AYRSHARE_API_KEY,
    AYRSHARE_PROFILE_KEY: !!process.env.AYRSHARE_PROFILE_KEY,
    AYRSHARE_PRIVATE_KEY: !!process.env.AYRSHARE_PRIVATE_KEY,
    AYRSHARE_DOMAIN: !!process.env.AYRSHARE_DOMAIN,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
  };

  res.status(200).json({ status: "ok", env: envStatus });
};
