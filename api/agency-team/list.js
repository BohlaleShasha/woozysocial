/**
 * List agency team roster
 * GET /api/agency-team/list?userId={userId}
 */
const {
  setCors,
  getSupabase,
  ErrorCodes,
  sendSuccess,
  sendError,
  logError,
  isValidUUID
} = require("../_utils");
const { SUBSCRIPTION_TIERS } = require("../_utils-access-control");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return sendError(res, "Method not allowed", ErrorCodes.METHOD_NOT_ALLOWED);
  }

  const supabase = getSupabase();
  if (!supabase) {
    return sendError(res, "Database service unavailable", ErrorCodes.CONFIG_ERROR);
  }

  try {
    const { userId } = req.query;

    if (!userId || !isValidUUID(userId)) {
      return sendError(res, "Valid userId is required", ErrorCodes.VALIDATION_ERROR);
    }

    // Verify user has agency subscription
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('subscription_tier, subscription_status, is_whitelisted')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      return sendError(res, "User not found", ErrorCodes.NOT_FOUND);
    }

    // Check agency tier or whitelisted
    const isAgency = userProfile.subscription_tier === SUBSCRIPTION_TIERS.AGENCY;
    const isActive = userProfile.subscription_status === 'active' || userProfile.is_whitelisted;

    if (!isAgency && !userProfile.is_whitelisted) {
      return sendError(res, "Agency subscription required", ErrorCodes.SUBSCRIPTION_REQUIRED);
    }

    if (!isActive) {
      return sendError(res, "Active subscription required", ErrorCodes.SUBSCRIPTION_REQUIRED);
    }

    // Fetch team roster
    const { data: teamMembers, error: teamError } = await supabase
      .from('agency_team_members')
      .select(`
        id,
        email,
        member_user_id,
        full_name,
        default_role,
        department,
        notes,
        status,
        created_at,
        updated_at
      `)
      .eq('agency_owner_id', userId)
      .order('created_at', { ascending: false });

    if (teamError) {
      logError('agency-team.list', teamError);
      return sendError(res, "Failed to fetch team roster", ErrorCodes.DATABASE_ERROR);
    }

    // Enrich with user profile data for registered members
    const memberUserIds = (teamMembers || [])
      .filter(m => m.member_user_id)
      .map(m => m.member_user_id);

    let profilesMap = {};
    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', memberUserIds);

      if (profiles) {
        profilesMap = profiles.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    const enrichedMembers = (teamMembers || []).map(member => ({
      ...member,
      profile: member.member_user_id ? profilesMap[member.member_user_id] || null : null,
      isRegistered: !!member.member_user_id
    }));

    return sendSuccess(res, {
      teamMembers: enrichedMembers,
      count: enrichedMembers.length
    });

  } catch (error) {
    logError('agency-team.list.handler', error);
    return sendError(res, "Failed to fetch team roster", ErrorCodes.INTERNAL_ERROR);
  }
};
