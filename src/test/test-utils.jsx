import React from 'react'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'

// Mock Auth Context
const mockAuthContext = {
  user: null,
  profile: null,
  loading: false,
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  resetPassword: vi.fn(),
  hasActiveProfile: false,
  subscriptionStatus: 'inactive',
  subscriptionTier: 'free',
  hasFeatureAccess: vi.fn(() => true),
  hasTabAccess: vi.fn(() => true),
}

// Mock Workspace Context
const mockWorkspaceContext = {
  currentWorkspace: null,
  userWorkspaces: [],
  isLoading: false,
  switchWorkspace: vi.fn(),
  createWorkspace: vi.fn(),
  canAccessTab: vi.fn(() => true),
}

// Create mock context providers
export const MockAuthContext = React.createContext(mockAuthContext)
export const MockWorkspaceContext = React.createContext(mockWorkspaceContext)

// Custom render with all providers
export function renderWithProviders(
  ui,
  {
    authValue = mockAuthContext,
    workspaceValue = mockWorkspaceContext,
    route = '/',
    ...renderOptions
  } = {}
) {
  window.history.pushState({}, 'Test page', route)

  function Wrapper({ children }) {
    return (
      <BrowserRouter>
        <ChakraProvider>
          <MockAuthContext.Provider value={authValue}>
            <MockWorkspaceContext.Provider value={workspaceValue}>
              {children}
            </MockWorkspaceContext.Provider>
          </MockAuthContext.Provider>
        </ChakraProvider>
      </BrowserRouter>
    )
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    authValue,
    workspaceValue,
  }
}

// Mock user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockProfile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'Test User',
  ayrshare_profile_key: 'test-profile-key',
  subscription_status: 'active',
  subscription_tier: 'pro',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockWorkspace = {
  id: 'test-workspace-id',
  name: 'Test Workspace',
  owner_id: 'test-user-id',
  created_at: '2024-01-01T00:00:00Z',
}

export const mockPost = {
  id: 'test-post-id',
  workspace_id: 'test-workspace-id',
  content: 'Test post content',
  platforms: ['twitter', 'facebook'],
  status: 'scheduled',
  scheduled_for: '2024-12-01T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  approval_status: 'pending',
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
