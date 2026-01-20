import { describe, it, expect, vi, beforeEach } from 'vitest'

// Test API utility functions and validation
describe('API Utilities', () => {
  describe('Error Codes', () => {
    const ERROR_CODES = {
      UNAUTHORIZED: 'UNAUTHORIZED',
      FORBIDDEN: 'FORBIDDEN',
      NOT_FOUND: 'NOT_FOUND',
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      INTERNAL_ERROR: 'INTERNAL_ERROR',
      RATE_LIMITED: 'RATE_LIMITED',
    }

    it('should have all required error codes', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBeDefined()
      expect(ERROR_CODES.FORBIDDEN).toBeDefined()
      expect(ERROR_CODES.NOT_FOUND).toBeDefined()
      expect(ERROR_CODES.VALIDATION_ERROR).toBeDefined()
    })
  })

  describe('Response Format', () => {
    const createSuccessResponse = (data) => ({
      success: true,
      data,
      statusCode: 200,
    })

    const createErrorResponse = (message, code, statusCode = 400) => ({
      success: false,
      error: message,
      code,
      statusCode,
    })

    it('should create valid success response', () => {
      const response = createSuccessResponse({ id: 1, name: 'Test' })

      expect(response.success).toBe(true)
      expect(response.data).toEqual({ id: 1, name: 'Test' })
      expect(response.statusCode).toBe(200)
    })

    it('should create valid error response', () => {
      const response = createErrorResponse('Invalid input', 'VALIDATION_ERROR', 400)

      expect(response.success).toBe(false)
      expect(response.error).toBe('Invalid input')
      expect(response.code).toBe('VALIDATION_ERROR')
      expect(response.statusCode).toBe(400)
    })
  })
})

describe('Post Validation', () => {
  const validatePost = (post) => {
    const errors = []

    if (!post.content || post.content.trim().length === 0) {
      errors.push('Content is required')
    }

    if (!post.platforms || post.platforms.length === 0) {
      errors.push('At least one platform is required')
    }

    if (post.content && post.content.length > 5000) {
      errors.push('Content exceeds maximum length')
    }

    const validPlatforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube']
    if (post.platforms) {
      const invalidPlatforms = post.platforms.filter(p => !validPlatforms.includes(p))
      if (invalidPlatforms.length > 0) {
        errors.push(`Invalid platforms: ${invalidPlatforms.join(', ')}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  it('should reject post without content', () => {
    const result = validatePost({ platforms: ['twitter'] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Content is required')
  })

  it('should reject post without platforms', () => {
    const result = validatePost({ content: 'Test content' })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('At least one platform is required')
  })

  it('should accept valid post', () => {
    const result = validatePost({
      content: 'Test content',
      platforms: ['twitter', 'facebook'],
    })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject invalid platform', () => {
    const result = validatePost({
      content: 'Test content',
      platforms: ['invalidplatform'],
    })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('Invalid platforms')
  })

  it('should reject content that is too long', () => {
    const result = validatePost({
      content: 'x'.repeat(5001),
      platforms: ['twitter'],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Content exceeds maximum length')
  })
})

describe('Approval Workflow', () => {
  const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'changes_requested']

  const validateStatusTransition = (currentStatus, newStatus, userRole) => {
    // Only certain roles can approve/reject
    const canApprove = ['owner', 'admin'].includes(userRole)

    if (!canApprove && ['approved', 'rejected'].includes(newStatus)) {
      return { valid: false, error: 'Insufficient permissions' }
    }

    // Cannot transition from approved/rejected back to pending
    if (['approved', 'rejected'].includes(currentStatus) && newStatus === 'pending') {
      return { valid: false, error: 'Cannot revert to pending' }
    }

    // Validate status values
    if (!APPROVAL_STATUSES.includes(newStatus)) {
      return { valid: false, error: 'Invalid status' }
    }

    return { valid: true }
  }

  it('should allow admin to approve post', () => {
    const result = validateStatusTransition('pending', 'approved', 'admin')
    expect(result.valid).toBe(true)
  })

  it('should prevent editor from approving post', () => {
    const result = validateStatusTransition('pending', 'approved', 'editor')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Insufficient permissions')
  })

  it('should prevent reverting approved post to pending', () => {
    const result = validateStatusTransition('approved', 'pending', 'admin')
    expect(result.valid).toBe(false)
  })

  it('should allow requesting changes', () => {
    const result = validateStatusTransition('pending', 'changes_requested', 'admin')
    expect(result.valid).toBe(true)
  })
})

describe('Workspace Validation', () => {
  const validateWorkspaceName = (name) => {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Workspace name is required' }
    }

    if (name.length < 2) {
      return { valid: false, error: 'Workspace name must be at least 2 characters' }
    }

    if (name.length > 50) {
      return { valid: false, error: 'Workspace name must be less than 50 characters' }
    }

    return { valid: true }
  }

  it('should reject empty workspace name', () => {
    const result = validateWorkspaceName('')
    expect(result.valid).toBe(false)
  })

  it('should reject too short workspace name', () => {
    const result = validateWorkspaceName('A')
    expect(result.valid).toBe(false)
  })

  it('should accept valid workspace name', () => {
    const result = validateWorkspaceName('My Workspace')
    expect(result.valid).toBe(true)
  })
})

describe('Invitation Validation', () => {
  const validateInvitation = (email, role) => {
    const errors = []

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      errors.push('Valid email is required')
    }

    // Role validation
    const validRoles = ['admin', 'editor', 'client', 'view_only']
    if (!role || !validRoles.includes(role)) {
      errors.push('Valid role is required')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  it('should reject invalid email', () => {
    const result = validateInvitation('invalid-email', 'editor')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Valid email is required')
  })

  it('should reject invalid role', () => {
    const result = validateInvitation('test@example.com', 'superuser')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Valid role is required')
  })

  it('should accept valid invitation', () => {
    const result = validateInvitation('test@example.com', 'editor')
    expect(result.valid).toBe(true)
  })

  it('should not allow inviting as owner', () => {
    const result = validateInvitation('test@example.com', 'owner')
    expect(result.valid).toBe(false)
  })
})
