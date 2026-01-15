/**
 * Access Control Utilities for API Endpoints
 *
 * This file contains subscription tier and role permission configurations
 * and helper functions for backend API protection.
 *
 * IMPORTANT: Keep this in sync with src/utils/constants.js
 */

// ===========================
// SUBSCRIPTION TIERS
// ===========================

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  SOLO: 'solo',
  PRO: 'pro',
  PRO_PLUS: 'pro_plus',
  AGENCY: 'agency'
};

export const TIER_CONFIG = {
  free: {
    workspaces: { max: 0 },
    team: { maxMembers: 0 },
    features: {
      canPost: false,
      aiFeatures: false,
      approvalWorkflows: false
    }
  },
  solo: {
    workspaces: { max: 1 },
    team: { maxMembers: 1 },
    features: {
      canPost: true,
      aiFeatures: false,
      approvalWorkflows: false
    }
  },
  pro: {
    workspaces: { max: 1 },
    team: { maxMembers: 3 },
    features: {
      canPost: true,
      aiFeatures: true,
      approvalWorkflows: false
    }
  },
  pro_plus: {
    workspaces: { max: 4 },
    team: { maxMembers: Infinity },
    features: {
      canPost: true,
      aiFeatures: true,
      approvalWorkflows: true
    }
  },
  agency: {
    workspaces: { max: Infinity },
    team: { maxMembers: Infinity },
    features: {
      canPost: true,
      aiFeatures: true,
      approvalWorkflows: true
    }
  },
  // Handle development/testing tiers
  development: {
    workspaces: { max: Infinity },
    team: { maxMembers: Infinity },
    features: {
      canPost: true,
      aiFeatures: true,
      approvalWorkflows: true
    }
  }
};

// ===========================
// TEAM ROLES
// ===========================

export const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  CLIENT: 'client',
  VIEW_ONLY: 'view_only'
};

export const ROLE_PERMISSIONS = {
  owner: {
    canManageTeam: true,
    canManageSettings: true,
    canDeletePosts: true,
    canApprovePosts: true,
    canCreatePosts: true,
    canEditAllPosts: true,
    canDeleteAllPosts: true,
    canDeleteWorkspace: true
  },
  admin: {
    canManageTeam: true,
    canManageSettings: true,
    canDeletePosts: true,
    canApprovePosts: true,
    canCreatePosts: true,
    canEditAllPosts: true,
    canDeleteAllPosts: true,
    canDeleteWorkspace: false
  },
  editor: {
    canManageTeam: false,
    canManageSettings: false,
    canDeletePosts: false,
    canApprovePosts: false,
    canCreatePosts: true,
    canEditAllPosts: false,
    canDeleteAllPosts: false,
    canDeleteWorkspace: false
  },
  client: {
    canManageTeam: false,
    canManageSettings: false,
    canDeletePosts: false,
    canApprovePosts: true,
    canCreatePosts: false,
    canEditAllPosts: false,
    canDeleteAllPosts: false,
    canDeleteWorkspace: false
  },
  view_only: {
    canManageTeam: false,
    canManageSettings: false,
    canDeletePosts: false,
    canApprovePosts: false,
    canCreatePosts: false,
    canEditAllPosts: false,
    canDeleteAllPosts: false,
    canDeleteWorkspace: false
  }
};

// ===========================
// HELPER FUNCTIONS
// ===========================

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role, permissionName) {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.view_only;
  return permissions[permissionName] === true;
}

/**
 * Check if a tier has a specific feature
 */
export function hasFeature(tier, featureName) {
  if (!tier) return false;
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  return config.features?.[featureName] === true;
}

/**
 * Check if user can create more workspaces
 */
export function canCreateWorkspace(tier, currentCount, addOns = 0) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const limit = config.workspaces.max + addOns;

  if (limit === Infinity) return true;
  return currentCount < limit;
}

/**
 * Check if user can invite more team members
 */
export function canInviteTeamMember(tier, currentCount) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const limit = config.team.maxMembers;

  if (limit === Infinity) return true;
  return currentCount < limit;
}

/**
 * Check if user can perform action on a post
 */
export function canPerformPostAction(role, action, isOwnPost = false) {
  const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.view_only;

  switch (action) {
    case 'edit':
      return isOwnPost || permissions.canEditAllPosts;
    case 'delete':
      return isOwnPost || permissions.canDeleteAllPosts;
    case 'approve':
      return permissions.canApprovePosts;
    case 'create':
      return permissions.canCreatePosts;
    default:
      return false;
  }
}

/**
 * Verify workspace membership and return member data
 * Returns { success: true, member: {...} } or { success: false, error: '...' }
 */
export async function verifyWorkspaceMembership(supabase, userId, workspaceId) {
  try {
    const { data: member, error } = await supabase
      .from('workspace_members')
      .select('id, user_id, workspace_id, role, can_manage_team, can_manage_settings, can_delete_posts, can_approve_posts')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return { success: false, error: 'Not a workspace member', code: 'NOT_MEMBER' };
    }

    if (!member) {
      return { success: false, error: 'Not a workspace member', code: 'NOT_MEMBER' };
    }

    return { success: true, member };
  } catch (err) {
    console.error('Error verifying workspace membership:', err);
    return { success: false, error: 'Failed to verify membership', code: 'VERIFICATION_ERROR' };
  }
}

/**
 * Check if user has required permission
 * Returns { success: true } or { success: false, error: '...' }
 */
export function checkPermission(member, permissionName) {
  if (!member || !member.role) {
    return { success: false, error: 'Invalid member data', code: 'INVALID_MEMBER' };
  }

  const allowed = hasPermission(member.role, permissionName);

  if (!allowed) {
    return {
      success: false,
      error: `Insufficient permissions. ${permissionName} required.`,
      code: 'INSUFFICIENT_PERMISSIONS'
    };
  }

  return { success: true };
}

/**
 * Send error response with consistent format
 */
export function sendError(res, message, code = 'ERROR', statusCode = 400) {
  const errorCodes = {
    'NOT_MEMBER': 403,
    'INSUFFICIENT_PERMISSIONS': 403,
    'FORBIDDEN': 403,
    'UNAUTHORIZED': 401,
    'NOT_FOUND': 404,
    'BAD_REQUEST': 400,
    'PAYMENT_REQUIRED': 402,
    'ERROR': 500
  };

  const status = errorCodes[code] || statusCode;

  return res.status(status).json({
    success: false,
    error: message,
    code: code
  });
}

/**
 * Send success response with consistent format
 */
export function sendSuccess(res, data = {}, message = null) {
  return res.status(200).json({
    success: true,
    data: data,
    message: message
  });
}
