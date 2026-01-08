import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { baseURL } from '../utils/constants';
import './AcceptInvite.css';

export const AcceptInvite = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshWorkspaces } = useWorkspace();
  const token = searchParams.get('token');

  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token]);

  // Check for pending invite after login
  useEffect(() => {
    const pendingToken = localStorage.getItem('pending_invite_token');
    if (pendingToken && user && !token) {
      // Redirect with the pending token
      navigate(`/accept-invite?token=${pendingToken}`);
      localStorage.removeItem('pending_invite_token');
    }
  }, [user, token, navigate]);

  const validateInvitation = async () => {
    try {
      setLoading(true);

      // Try workspace invitation first
      const response = await fetch(`${baseURL}/api/workspace/validate-invite?token=${token}`);

      if (response.ok) {
        const result = await response.json();

        if (result.success && result.invitation) {
          setInvitation({
            ...result.invitation,
            type: 'workspace'
          });
          setLoading(false);
          return;
        }
      }

      // Fallback to old team invitation
      const teamResponse = await fetch(`${baseURL}/api/team/validate-invite?token=${token}`);

      if (!teamResponse.ok) {
        const result = await teamResponse.json();
        setError(result.error || 'Invitation not found or invalid');
        setLoading(false);
        return;
      }

      const result = await teamResponse.json();

      if (!result.data) {
        setError('Invitation not found or invalid');
        setLoading(false);
        return;
      }

      const data = result.data;

      // Check if already accepted
      if (data.status === 'accepted') {
        setError('This invitation has already been accepted');
        setLoading(false);
        return;
      }

      // Check if cancelled
      if (data.status === 'cancelled') {
        setError('This invitation has been cancelled');
        setLoading(false);
        return;
      }

      // Check if expired
      const expiresAt = new Date(data.expires_at);
      if (new Date() > expiresAt) {
        setError('This invitation has expired');
        setLoading(false);
        return;
      }

      setInvitation({
        ...data,
        type: 'team'
      });
      setLoading(false);
    } catch (error) {
      console.error('Error validating invitation:', error);
      setError('An error occurred while validating the invitation');
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user) {
      // Save token to localStorage and redirect to login
      localStorage.setItem('pending_invite_token', token);
      navigate('/login?redirect=/accept-invite');
      return;
    }

    try {
      setAccepting(true);

      // Determine which endpoint to use
      const endpoint = invitation.type === 'workspace'
        ? `${baseURL}/api/workspace/accept-invite`
        : `${baseURL}/api/team/accept-invite`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteToken: token,
          token: token, // for backwards compatibility
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      // Refresh workspaces to load the newly joined workspace
      // The API has already set last_workspace_id, so it will auto-select
      await refreshWorkspaces();

      // Success! Redirect based on invitation type
      const redirectPath = invitation.type === 'workspace' ? '/team' : '/team';
      const message = invitation.type === 'workspace'
        ? `You have successfully joined ${invitation.workspace?.name || 'the workspace'}!`
        : 'You have successfully joined the team!';

      navigate(redirectPath, { state: { message } });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'Failed to accept invitation');
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this invitation?')) {
      return;
    }

    try {
      setAccepting(true);
      // For now, just navigate away - the invitation will expire
      navigate('/', { state: { message: 'Invitation declined' } });
    } catch (error) {
      console.error('Error declining invitation:', error);
      setError('Failed to decline invitation');
      setAccepting(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Admin',
      editor: 'Editor',
      client: 'Client',
      view_only: 'View Only',
    };
    return labels[role] || role;
  };

  const getRoleDescription = (role) => {
    const descriptions = {
      admin: 'Full access - can invite, remove members, and manage all posts',
      editor: 'Can create, edit, and schedule posts',
      client: 'Can view and approve/reject scheduled posts',
      view_only: 'Read-only access - can view posts and team members',
    };
    return descriptions[role] || '';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="accept-invite-container">
        <div className="accept-invite-card">
          <div className="loading-spinner"></div>
          <p className="loading-text">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="accept-invite-container">
        <div className="accept-invite-card error">
          <div className="error-icon">✕</div>
          <h1 className="error-title">Invalid Invitation</h1>
          <p className="error-message">{error}</p>
          <button className="back-button" onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invite-container">
      <div className="accept-invite-card">
        <div className="invite-header">
          <div className="invite-icon">✉</div>
          <h1 className="invite-title">You're Invited!</h1>
          <p className="invite-subtitle">
            {invitation.type === 'workspace'
              ? `You've been invited to ${invitation.workspace?.name || 'a business'}`
              : "You've been invited to join a team"
            }
          </p>
        </div>

        <div className="invite-details">
          {invitation.type === 'workspace' && invitation.workspace?.name && (
            <div className="detail-row">
              <span className="detail-label">Business:</span>
              <span className="detail-value business-name">{invitation.workspace.name}</span>
            </div>
          )}
          <div className="detail-row">
            <span className="detail-label">Email:</span>
            <span className="detail-value">{invitation.email}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Role:</span>
            <span className="detail-value role-badge">{getRoleLabel(invitation.role)}</span>
          </div>
          <div className="detail-row description">
            <span className="detail-description">{getRoleDescription(invitation.role)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Invited:</span>
            <span className="detail-value">{formatDate(invitation.invited_at)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Expires:</span>
            <span className="detail-value">{formatDate(invitation.expires_at)}</span>
          </div>
        </div>

        {!user && (
          <div className="auth-notice">
            <p>You need to sign in or create an account to accept this invitation.</p>
          </div>
        )}

        <div className="invite-actions">
          <button
            className="accept-button"
            onClick={handleAccept}
            disabled={accepting}
          >
            {accepting ? 'Processing...' : user ? 'Accept Invitation' : 'Sign In to Accept'}
          </button>
          <button
            className="decline-button"
            onClick={handleDecline}
            disabled={accepting}
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};
