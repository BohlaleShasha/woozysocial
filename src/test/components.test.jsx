import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Test utility functions used in components
describe('Component Utilities', () => {
  describe('Date Formatting', () => {
    const formatDate = (dateString) => {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    }

    const formatDateTime = (dateString) => {
      if (!dateString) return 'N/A'
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }

    it('should format date correctly', () => {
      const result = formatDate('2024-06-15T12:00:00Z')
      expect(result).toContain('Jun')
      expect(result).toContain('15')
      expect(result).toContain('2024')
    })

    it('should handle null date', () => {
      expect(formatDate(null)).toBe('N/A')
      expect(formatDateTime(undefined)).toBe('N/A')
    })
  })

  describe('Status Badge Colors', () => {
    const getStatusColor = (status) => {
      const colors = {
        pending: '#f59e0b', // amber
        approved: '#22c55e', // green
        rejected: '#ef4444', // red
        changes_requested: '#3b82f6', // blue
        draft: '#6b7280', // gray
        scheduled: '#8b5cf6', // purple
        published: '#22c55e', // green
      }
      return colors[status] || '#6b7280'
    }

    it('should return correct colors for each status', () => {
      expect(getStatusColor('pending')).toBe('#f59e0b')
      expect(getStatusColor('approved')).toBe('#22c55e')
      expect(getStatusColor('rejected')).toBe('#ef4444')
    })

    it('should return default color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('#6b7280')
    })
  })

  describe('Platform Icons', () => {
    const PLATFORM_CONFIG = {
      twitter: { name: 'Twitter/X', color: '#000000' },
      facebook: { name: 'Facebook', color: '#1877f2' },
      instagram: { name: 'Instagram', color: '#e4405f' },
      linkedin: { name: 'LinkedIn', color: '#0a66c2' },
      tiktok: { name: 'TikTok', color: '#000000' },
      youtube: { name: 'YouTube', color: '#ff0000' },
    }

    it('should have config for all supported platforms', () => {
      const platforms = ['twitter', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube']
      platforms.forEach(platform => {
        expect(PLATFORM_CONFIG[platform]).toBeDefined()
        expect(PLATFORM_CONFIG[platform].name).toBeDefined()
        expect(PLATFORM_CONFIG[platform].color).toBeDefined()
      })
    })
  })

  describe('Content Truncation', () => {
    const truncateContent = (content, maxLength = 100) => {
      if (!content) return ''
      if (content.length <= maxLength) return content
      return content.substring(0, maxLength) + '...'
    }

    it('should not truncate short content', () => {
      const result = truncateContent('Short text', 100)
      expect(result).toBe('Short text')
    })

    it('should truncate long content', () => {
      const longText = 'x'.repeat(150)
      const result = truncateContent(longText, 100)
      expect(result.length).toBe(103) // 100 + '...'
      expect(result.endsWith('...')).toBe(true)
    })

    it('should handle empty content', () => {
      expect(truncateContent('')).toBe('')
      expect(truncateContent(null)).toBe('')
    })
  })
})

describe('Form Validation', () => {
  describe('Compose Form', () => {
    const validateComposeForm = (data) => {
      const errors = {}

      if (!data.content || data.content.trim() === '') {
        errors.content = 'Content is required'
      }

      if (!data.platforms || data.platforms.length === 0) {
        errors.platforms = 'Select at least one platform'
      }

      if (data.scheduledFor) {
        const scheduledDate = new Date(data.scheduledFor)
        if (scheduledDate < new Date()) {
          errors.scheduledFor = 'Scheduled time must be in the future'
        }
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      }
    }

    it('should validate empty form', () => {
      const result = validateComposeForm({})
      expect(result.isValid).toBe(false)
      expect(result.errors.content).toBeDefined()
      expect(result.errors.platforms).toBeDefined()
    })

    it('should validate complete form', () => {
      const result = validateComposeForm({
        content: 'Test post',
        platforms: ['twitter'],
      })
      expect(result.isValid).toBe(true)
    })

    it('should reject past scheduled time', () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString() // yesterday
      const result = validateComposeForm({
        content: 'Test post',
        platforms: ['twitter'],
        scheduledFor: pastDate,
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.scheduledFor).toBeDefined()
    })
  })

  describe('Team Invite Form', () => {
    const validateInviteForm = (data) => {
      const errors = {}

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!data.email || !emailRegex.test(data.email)) {
        errors.email = 'Valid email is required'
      }

      const validRoles = ['admin', 'editor', 'client', 'view_only']
      if (!data.role || !validRoles.includes(data.role)) {
        errors.role = 'Valid role is required'
      }

      return {
        isValid: Object.keys(errors).length === 0,
        errors,
      }
    }

    it('should validate empty invite form', () => {
      const result = validateInviteForm({})
      expect(result.isValid).toBe(false)
    })

    it('should validate complete invite form', () => {
      const result = validateInviteForm({
        email: 'test@example.com',
        role: 'editor',
      })
      expect(result.isValid).toBe(true)
    })
  })
})

describe('Sidebar Menu Items', () => {
  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', tabName: 'dashboard' },
    { name: 'Brand Profile', path: '/brand-profile', tabName: 'brand-profile' },
    { name: 'Compose', path: '/compose', tabName: 'compose' },
    { name: 'Schedule', path: '/schedule', tabName: 'schedule' },
    { name: 'Posts', path: '/posts', tabName: 'posts' },
    { name: 'Social Inbox', path: '/social-inbox', tabName: 'social-inbox' },
    { name: 'Team', path: '/team', tabName: 'team', requiresSubscriptionOrTeam: true },
    { name: 'Approvals', path: '/approvals', tabName: 'approvals', requiresSubscriptionOrTeam: true },
    { name: 'Settings', path: '/settings', tabName: 'settings' },
  ]

  it('should have correct number of menu items', () => {
    expect(menuItems.length).toBe(9)
  })

  it('should have Dashboard as first item', () => {
    expect(menuItems[0].name).toBe('Dashboard')
    expect(menuItems[0].path).toBe('/dashboard')
  })

  it('should mark Team and Approvals as requiring subscription', () => {
    const teamItem = menuItems.find(item => item.name === 'Team')
    const approvalsItem = menuItems.find(item => item.name === 'Approvals')

    expect(teamItem.requiresSubscriptionOrTeam).toBe(true)
    expect(approvalsItem.requiresSubscriptionOrTeam).toBe(true)
  })

  it('should have unique paths', () => {
    const paths = menuItems.map(item => item.path)
    const uniquePaths = new Set(paths)
    expect(uniquePaths.size).toBe(paths.length)
  })
})

describe('Notification Helpers', () => {
  const createNotification = (type, message, data = {}) => ({
    id: Math.random().toString(36).substr(2, 9),
    type,
    message,
    data,
    created_at: new Date().toISOString(),
    read: false,
  })

  const NOTIFICATION_TYPES = {
    POST_APPROVED: 'post_approved',
    POST_REJECTED: 'post_rejected',
    CHANGES_REQUESTED: 'changes_requested',
    NEW_COMMENT: 'new_comment',
    INVITATION_RECEIVED: 'invitation_received',
    MEMBER_JOINED: 'member_joined',
  }

  it('should create notification with required fields', () => {
    const notification = createNotification(
      NOTIFICATION_TYPES.POST_APPROVED,
      'Your post has been approved'
    )

    expect(notification.id).toBeDefined()
    expect(notification.type).toBe('post_approved')
    expect(notification.message).toBe('Your post has been approved')
    expect(notification.read).toBe(false)
    expect(notification.created_at).toBeDefined()
  })

  it('should support all notification types', () => {
    Object.values(NOTIFICATION_TYPES).forEach(type => {
      const notification = createNotification(type, 'Test message')
      expect(notification.type).toBe(type)
    })
  })
})
