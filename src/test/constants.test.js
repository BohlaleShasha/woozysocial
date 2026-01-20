import { describe, it, expect } from 'vitest'
import {
  SUBSCRIPTION_TIERS,
  TIER_CONFIG,
  getTierConfig,
  hasFeature,
  hasTabAccess,
  getWorkspaceLimit,
  canCreateWorkspace,
  getTeamMemberLimit,
  canInviteTeamMember,
  TEAM_ROLES,
  ROLE_CONFIG,
  getRoleConfig,
  hasPermission,
  hasRoleTabAccess,
  isClientRole,
  isAdminRole,
  canPerformPostAction
} from '../utils/constants.js'

// ===========================
// SUBSCRIPTION TIER TESTS
// ===========================

describe('Subscription Tiers', () => {
  describe('SUBSCRIPTION_TIERS constants', () => {
    it('should have all required tier constants', () => {
      expect(SUBSCRIPTION_TIERS.FREE).toBe('free')
      expect(SUBSCRIPTION_TIERS.SOLO).toBe('solo')
      expect(SUBSCRIPTION_TIERS.PRO).toBe('pro')
      expect(SUBSCRIPTION_TIERS.PRO_PLUS).toBe('pro_plus')
      expect(SUBSCRIPTION_TIERS.AGENCY).toBe('agency')
    })
  })

  describe('TIER_CONFIG', () => {
    it('should have configuration for all tiers', () => {
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.FREE]).toBeDefined()
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.SOLO]).toBeDefined()
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.PRO]).toBeDefined()
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.PRO_PLUS]).toBeDefined()
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.AGENCY]).toBeDefined()
    })

    it('should have correct pricing for each tier', () => {
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.FREE].price).toBe(0)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.SOLO].price).toBe(19)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.PRO].price).toBe(49)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.PRO_PLUS].price).toBe(99)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.AGENCY].price).toBe(299)
    })

    it('should restrict free tier correctly', () => {
      const free = TIER_CONFIG[SUBSCRIPTION_TIERS.FREE]
      expect(free.workspaces.max).toBe(0)
      expect(free.workspaces.canCreate).toBe(false)
      expect(free.team.maxMembers).toBe(0)
      expect(free.team.canInvite).toBe(false)
      expect(free.features.canPost).toBe(false)
      expect(free.features.canConnectSocials).toBe(false)
    })

    it('should enable posting for Solo tier', () => {
      const solo = TIER_CONFIG[SUBSCRIPTION_TIERS.SOLO]
      expect(solo.features.canPost).toBe(true)
      expect(solo.features.canConnectSocials).toBe(true)
      expect(solo.features.hasAyrshareKey).toBe(true)
    })

    it('should enable AI features for Pro tier', () => {
      const pro = TIER_CONFIG[SUBSCRIPTION_TIERS.PRO]
      expect(pro.features.aiFeatures).toBe(true)
      expect(pro.features.captionSuggestions).toBe(true)
      expect(pro.features.bestTimeToPost).toBe(true)
      expect(pro.features.postPredictions).toBe(true)
    })

    it('should enable approval workflows only for Pro Plus and above', () => {
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.FREE].features.approvalWorkflows).toBe(false)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.SOLO].features.approvalWorkflows).toBe(false)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.PRO].features.approvalWorkflows).toBe(false)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.PRO_PLUS].features.approvalWorkflows).toBe(true)
      expect(TIER_CONFIG[SUBSCRIPTION_TIERS.AGENCY].features.approvalWorkflows).toBe(true)
    })

    it('should grant unlimited workspaces to Agency tier', () => {
      const agency = TIER_CONFIG[SUBSCRIPTION_TIERS.AGENCY]
      expect(agency.workspaces.max).toBe(Infinity)
      expect(agency.team.maxMembers).toBe(Infinity)
    })
  })

  describe('getTierConfig', () => {
    it('should return correct config for valid tiers', () => {
      const soloConfig = getTierConfig('solo')
      expect(soloConfig.name).toBe('Solo')
      expect(soloConfig.price).toBe(19)
    })

    it('should return FREE config for invalid tier', () => {
      const invalidConfig = getTierConfig('invalid_tier')
      expect(invalidConfig.name).toBe('Free')
    })

    it('should treat development tier as Agency', () => {
      const devConfig = getTierConfig('development')
      expect(devConfig.name).toBe('Agency')
    })

    it('should treat testing tier as Agency', () => {
      const testConfig = getTierConfig('testing')
      expect(testConfig.name).toBe('Agency')
    })
  })

  describe('hasFeature', () => {
    it('should correctly check feature access', () => {
      expect(hasFeature('free', 'canPost')).toBe(false)
      expect(hasFeature('solo', 'canPost')).toBe(true)
      expect(hasFeature('pro', 'aiFeatures')).toBe(true)
      expect(hasFeature('solo', 'aiFeatures')).toBe(false)
    })

    it('should return false for non-existent features', () => {
      expect(hasFeature('agency', 'nonExistentFeature')).toBe(false)
    })
  })

  describe('hasTabAccess', () => {
    it('should restrict free tier to minimal tabs', () => {
      expect(hasTabAccess('free', 'pricing')).toBe(true)
      expect(hasTabAccess('free', 'settings')).toBe(true)
      expect(hasTabAccess('free', 'compose')).toBe(false)
      expect(hasTabAccess('free', 'dashboard')).toBe(false)
    })

    it('should allow Solo tier access to core tabs', () => {
      expect(hasTabAccess('solo', 'dashboard')).toBe(true)
      expect(hasTabAccess('solo', 'compose')).toBe(true)
      expect(hasTabAccess('solo', 'schedule')).toBe(true)
      expect(hasTabAccess('solo', 'team')).toBe(false) // No team for Solo
    })

    it('should allow Pro tier access to team', () => {
      expect(hasTabAccess('pro', 'team')).toBe(true)
      expect(hasTabAccess('pro', 'brand-profile')).toBe(true)
      expect(hasTabAccess('pro', 'approvals')).toBe(false) // No approvals for Pro
    })

    it('should allow Pro Plus and Agency access to approvals', () => {
      expect(hasTabAccess('pro_plus', 'approvals')).toBe(true)
      expect(hasTabAccess('agency', 'approvals')).toBe(true)
    })
  })

  describe('getWorkspaceLimit', () => {
    it('should return correct base limits', () => {
      expect(getWorkspaceLimit('free')).toBe(0)
      expect(getWorkspaceLimit('solo')).toBe(1)
      expect(getWorkspaceLimit('pro')).toBe(1)
      expect(getWorkspaceLimit('pro_plus')).toBe(4)
      expect(getWorkspaceLimit('agency')).toBe(Infinity)
    })

    it('should add workspace add-ons to limit', () => {
      expect(getWorkspaceLimit('pro_plus', 2)).toBe(6) // 4 + 2
      expect(getWorkspaceLimit('pro', 3)).toBe(4) // 1 + 3
    })

    it('should handle unlimited (Infinity) correctly', () => {
      expect(getWorkspaceLimit('agency', 10)).toBe(Infinity)
    })
  })

  describe('canCreateWorkspace', () => {
    it('should not allow free tier to create workspaces', () => {
      expect(canCreateWorkspace('free', 0)).toBe(false)
    })

    it('should allow Solo to create one workspace', () => {
      expect(canCreateWorkspace('solo', 0)).toBe(true)
      expect(canCreateWorkspace('solo', 1)).toBe(false)
    })

    it('should allow Pro Plus to create multiple workspaces', () => {
      expect(canCreateWorkspace('pro_plus', 0)).toBe(true)
      expect(canCreateWorkspace('pro_plus', 3)).toBe(true)
      expect(canCreateWorkspace('pro_plus', 4)).toBe(false) // At limit
    })

    it('should always allow Agency to create workspaces', () => {
      expect(canCreateWorkspace('agency', 0)).toBe(true)
      expect(canCreateWorkspace('agency', 100)).toBe(true)
      expect(canCreateWorkspace('agency', 1000)).toBe(true)
    })
  })

  describe('getTeamMemberLimit', () => {
    it('should return correct team limits', () => {
      expect(getTeamMemberLimit('free')).toBe(0)
      expect(getTeamMemberLimit('solo')).toBe(1)
      expect(getTeamMemberLimit('pro')).toBe(3)
      expect(getTeamMemberLimit('pro_plus')).toBe(Infinity)
      expect(getTeamMemberLimit('agency')).toBe(Infinity)
    })
  })

  describe('canInviteTeamMember', () => {
    it('should not allow free tier to invite', () => {
      expect(canInviteTeamMember('free', 0)).toBe(false)
    })

    it('should not allow Solo tier to invite', () => {
      expect(canInviteTeamMember('solo', 0)).toBe(false)
      expect(canInviteTeamMember('solo', 1)).toBe(false)
    })

    it('should allow Pro tier to invite up to limit', () => {
      expect(canInviteTeamMember('pro', 0)).toBe(true)
      expect(canInviteTeamMember('pro', 2)).toBe(true)
      expect(canInviteTeamMember('pro', 3)).toBe(false) // At limit
    })

    it('should always allow Pro Plus and Agency to invite', () => {
      expect(canInviteTeamMember('pro_plus', 100)).toBe(true)
      expect(canInviteTeamMember('agency', 1000)).toBe(true)
    })
  })
})

// ===========================
// TEAM ROLE TESTS
// ===========================

describe('Team Roles', () => {
  describe('TEAM_ROLES constants', () => {
    it('should have all required role constants', () => {
      expect(TEAM_ROLES.OWNER).toBe('owner')
      expect(TEAM_ROLES.ADMIN).toBe('admin')
      expect(TEAM_ROLES.EDITOR).toBe('editor')
      expect(TEAM_ROLES.CLIENT).toBe('client')
      expect(TEAM_ROLES.VIEW_ONLY).toBe('view_only')
    })
  })

  describe('ROLE_CONFIG', () => {
    it('should have configuration for all roles', () => {
      expect(ROLE_CONFIG[TEAM_ROLES.OWNER]).toBeDefined()
      expect(ROLE_CONFIG[TEAM_ROLES.ADMIN]).toBeDefined()
      expect(ROLE_CONFIG[TEAM_ROLES.EDITOR]).toBeDefined()
      expect(ROLE_CONFIG[TEAM_ROLES.CLIENT]).toBeDefined()
      expect(ROLE_CONFIG[TEAM_ROLES.VIEW_ONLY]).toBeDefined()
    })

    it('should grant owner all permissions', () => {
      const owner = ROLE_CONFIG[TEAM_ROLES.OWNER]
      expect(owner.permissions.canManageTeam).toBe(true)
      expect(owner.permissions.canManageSettings).toBe(true)
      expect(owner.permissions.canDeleteWorkspace).toBe(true)
      expect(owner.permissions.canTransferOwnership).toBe(true)
    })

    it('should not allow admin to delete workspace', () => {
      const admin = ROLE_CONFIG[TEAM_ROLES.ADMIN]
      expect(admin.permissions.canDeleteWorkspace).toBe(false)
      expect(admin.permissions.canTransferOwnership).toBe(false)
      expect(admin.permissions.canManageTeam).toBe(true)
    })

    it('should restrict editor permissions', () => {
      const editor = ROLE_CONFIG[TEAM_ROLES.EDITOR]
      expect(editor.permissions.canCreatePosts).toBe(true)
      expect(editor.permissions.canEditOwnPosts).toBe(true)
      expect(editor.permissions.canEditAllPosts).toBe(false)
      expect(editor.permissions.canManageTeam).toBe(false)
      expect(editor.permissions.canApprovePosts).toBe(false)
    })

    it('should allow client to approve posts only', () => {
      const client = ROLE_CONFIG[TEAM_ROLES.CLIENT]
      expect(client.permissions.canApprovePosts).toBe(true)
      expect(client.permissions.canCreatePosts).toBe(false)
      expect(client.permissions.canManageTeam).toBe(false)
    })

    it('should restrict view_only to read-only', () => {
      const viewOnly = ROLE_CONFIG[TEAM_ROLES.VIEW_ONLY]
      expect(viewOnly.permissions.canCreatePosts).toBe(false)
      expect(viewOnly.permissions.canApprovePosts).toBe(false)
      expect(viewOnly.permissions.canViewAnalytics).toBe(true)
    })
  })

  describe('getRoleConfig', () => {
    it('should return correct config for valid roles', () => {
      const adminConfig = getRoleConfig('admin')
      expect(adminConfig.name).toBe('Admin')
    })

    it('should return VIEW_ONLY config for invalid role', () => {
      const invalidConfig = getRoleConfig('invalid_role')
      expect(invalidConfig.name).toBe('View Only')
    })
  })

  describe('hasPermission', () => {
    it('should correctly check permissions', () => {
      expect(hasPermission('owner', 'canDeleteWorkspace')).toBe(true)
      expect(hasPermission('admin', 'canDeleteWorkspace')).toBe(false)
      expect(hasPermission('editor', 'canCreatePosts')).toBe(true)
      expect(hasPermission('client', 'canApprovePosts')).toBe(true)
      expect(hasPermission('view_only', 'canCreatePosts')).toBe(false)
    })
  })

  describe('hasRoleTabAccess', () => {
    it('should allow owner access to all tabs', () => {
      expect(hasRoleTabAccess('owner', 'dashboard')).toBe(true)
      expect(hasRoleTabAccess('owner', 'team')).toBe(true)
      expect(hasRoleTabAccess('owner', 'approvals')).toBe(true)
      expect(hasRoleTabAccess('owner', 'settings')).toBe(true)
    })

    it('should restrict client to client portal tabs', () => {
      expect(hasRoleTabAccess('client', 'client/dashboard')).toBe(true)
      expect(hasRoleTabAccess('client', 'client/approvals')).toBe(true)
      expect(hasRoleTabAccess('client', 'compose')).toBe(false)
      expect(hasRoleTabAccess('client', 'settings')).toBe(false)
    })

    it('should restrict view_only to read-only tabs', () => {
      expect(hasRoleTabAccess('view_only', 'dashboard')).toBe(true)
      expect(hasRoleTabAccess('view_only', 'posts')).toBe(true)
      expect(hasRoleTabAccess('view_only', 'compose')).toBe(false)
      expect(hasRoleTabAccess('view_only', 'team')).toBe(false)
    })
  })

  describe('isClientRole', () => {
    it('should identify client roles correctly', () => {
      expect(isClientRole('client')).toBe(true)
      expect(isClientRole('view_only')).toBe(true)
      expect(isClientRole('editor')).toBe(false)
      expect(isClientRole('admin')).toBe(false)
      expect(isClientRole('owner')).toBe(false)
    })
  })

  describe('isAdminRole', () => {
    it('should identify admin roles correctly', () => {
      expect(isAdminRole('owner')).toBe(true)
      expect(isAdminRole('admin')).toBe(true)
      expect(isAdminRole('editor')).toBe(false)
      expect(isAdminRole('client')).toBe(false)
      expect(isAdminRole('view_only')).toBe(false)
    })
  })

  describe('canPerformPostAction', () => {
    it('should allow owner to perform all actions', () => {
      expect(canPerformPostAction('owner', 'edit', true)).toBe(true)
      expect(canPerformPostAction('owner', 'edit', false)).toBe(true)
      expect(canPerformPostAction('owner', 'delete', true)).toBe(true)
      expect(canPerformPostAction('owner', 'delete', false)).toBe(true)
      expect(canPerformPostAction('owner', 'approve')).toBe(true)
      expect(canPerformPostAction('owner', 'create')).toBe(true)
    })

    it('should allow editor to edit/delete own posts only', () => {
      expect(canPerformPostAction('editor', 'edit', true)).toBe(true)
      expect(canPerformPostAction('editor', 'edit', false)).toBe(false)
      expect(canPerformPostAction('editor', 'delete', true)).toBe(true)
      expect(canPerformPostAction('editor', 'delete', false)).toBe(false)
      expect(canPerformPostAction('editor', 'create')).toBe(true)
      expect(canPerformPostAction('editor', 'approve')).toBe(false)
    })

    it('should allow client to approve only', () => {
      expect(canPerformPostAction('client', 'approve')).toBe(true)
      expect(canPerformPostAction('client', 'create')).toBe(false)
      expect(canPerformPostAction('client', 'edit', true)).toBe(false)
    })

    it('should not allow view_only any post actions', () => {
      expect(canPerformPostAction('view_only', 'create')).toBe(false)
      expect(canPerformPostAction('view_only', 'edit', true)).toBe(false)
      expect(canPerformPostAction('view_only', 'delete', true)).toBe(false)
      expect(canPerformPostAction('view_only', 'approve')).toBe(false)
    })

    it('should return false for unknown actions', () => {
      expect(canPerformPostAction('owner', 'unknown_action')).toBe(false)
    })
  })
})
