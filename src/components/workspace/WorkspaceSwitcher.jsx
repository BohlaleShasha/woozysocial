import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { InviteClientModal } from './InviteClientModal';
import './WorkspaceSwitcher.css';

export const WorkspaceSwitcher = () => {
  const { activeWorkspace, userWorkspaces, switchWorkspace, loading } = useWorkspace();
  const { user, profile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Create a fallback "personal workspace" from user info
  const personalWorkspace = {
    id: user?.id || 'personal',
    name: profile?.full_name || user?.email?.split('@')[0] || 'My Workspace',
    logo_url: null
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => document.removeEventListener('click', handleClickOutside);
  }, [showDropdown]);

  const handleWorkspaceSwitch = async (workspaceId) => {
    if (workspaceId === activeWorkspace?.id) {
      setShowDropdown(false);
      return;
    }

    const { error } = await switchWorkspace(workspaceId);
    if (error) {
      console.error('Failed to switch workspace:', error);
      // TODO: Show error toast notification
    }
    setShowDropdown(false);
    // Context switch triggers re-render of all components using workspace data
  };

  const handleSettingsClick = () => {
    setShowDropdown(false);
    navigate('/settings?tab=workspace');
  };

  const handleAddBusinessClick = () => {
    setShowDropdown(false);
    setShowCreateModal(true);
  };

  const handleInviteClientClick = () => {
    setShowDropdown(false);
    setShowInviteModal(true);
  };

  // Only show loading skeleton briefly while auth is loading
  if (loading && !user) {
    return (
      <div className="workspace-switcher-skeleton">
        <div className="workspace-logo-skeleton"></div>
        <div className="workspace-name-skeleton"></div>
      </div>
    );
  }

  // Use activeWorkspace if available, otherwise fall back to personal workspace
  const displayWorkspace = activeWorkspace || personalWorkspace;
  const hasMultipleWorkspaces = userWorkspaces.length > 1;

  return (
    <div className="workspace-switcher" ref={dropdownRef}>
      <button
        className="workspace-trigger"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="Switch workspace"
        aria-expanded={showDropdown}
      >
        <div className="workspace-logo">
          {displayWorkspace.logo_url ? (
            <img src={displayWorkspace.logo_url} alt={displayWorkspace.name} />
          ) : (
            <span className="workspace-initial">
              {displayWorkspace.name[0]?.toUpperCase() || 'W'}
            </span>
          )}
        </div>
        <span className="workspace-name">{displayWorkspace.name}</span>
        <svg
          className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 4L6 8L10 4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {showDropdown && (
        <div className="workspace-dropdown">
          <div className="dropdown-section">
            <div className="section-label">Workspaces</div>
            <div className="workspaces-list">
              {userWorkspaces.length > 0 ? (
                userWorkspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    className={`workspace-item ${workspace.id === displayWorkspace.id ? 'active' : ''}`}
                    onClick={() => handleWorkspaceSwitch(workspace.id)}
                  >
                    <div className="workspace-item-logo">
                      {workspace.logo_url ? (
                        <img src={workspace.logo_url} alt={workspace.name} />
                      ) : (
                        <span className="workspace-item-initial">
                          {workspace.name[0]?.toUpperCase() || 'W'}
                        </span>
                      )}
                    </div>
                    <div className="workspace-item-info">
                      <div className="workspace-item-name">{workspace.name}</div>
                      <div className="workspace-item-role">
                        {workspace.membership?.role?.toUpperCase() || 'MEMBER'}
                      </div>
                    </div>
                    {workspace.id === displayWorkspace.id && (
                      <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M13 4L6 11L3 8"
                          stroke="#FFC801"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                ))
              ) : (
                <div
                  className="workspace-item active"
                  style={{ cursor: 'default' }}
                >
                  <div className="workspace-item-logo">
                    <span className="workspace-item-initial">
                      {personalWorkspace.name[0]?.toUpperCase() || 'W'}
                    </span>
                  </div>
                  <div className="workspace-item-info">
                    <div className="workspace-item-name">{personalWorkspace.name}</div>
                    <div className="workspace-item-role">PERSONAL</div>
                  </div>
                  <svg className="check-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M13 4L6 11L3 8"
                      stroke="#FFC801"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>

          <div className="dropdown-divider" />

          <button className="dropdown-action add-business" onClick={handleAddBusinessClick}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Add Business
          </button>

          <button className="dropdown-action invite-client" onClick={handleInviteClientClick}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M10 14v-1.5a2.5 2.5 0 00-2.5-2.5h-4A2.5 2.5 0 001 12.5V14M5.5 7a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM12 5v4M10 7h4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Invite Client
          </button>

          <button className="dropdown-action" onClick={handleSettingsClick}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="settings-icon">
              <path
                d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M13 8C13 8.34 12.99 8.67 12.96 9L14.21 9.88L13.21 11.62L11.72 11.06C11.37 11.37 10.97 11.62 10.54 11.81L10.3 13.4H8.3L8.06 11.81C7.63 11.62 7.23 11.37 6.88 11.06L5.39 11.62L4.39 9.88L5.64 9C5.61 8.67 5.6 8.34 5.6 8C5.6 7.66 5.61 7.33 5.64 7L4.39 6.12L5.39 4.38L6.88 4.94C7.23 4.63 7.63 4.38 8.06 4.19L8.3 2.6H10.3L10.54 4.19C10.97 4.38 11.37 4.63 11.72 4.94L13.21 4.38L14.21 6.12L12.96 7C12.99 7.33 13 7.66 13 8Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Settings
          </button>
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <InviteClientModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  );
};
