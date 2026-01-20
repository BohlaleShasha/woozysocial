import React, { useState } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { useAuth } from '../../contexts/AuthContext';
import { useAgencyTeam } from '../../hooks/useQueries';
import { WorkspaceTeamProvisionModal } from './WorkspaceTeamProvisionModal';
import { SUBSCRIPTION_TIERS } from '../../utils/constants';
import './CreateWorkspaceModal.css';

export const CreateWorkspaceModal = ({ isOpen, onClose }) => {
  const { createWorkspace } = useWorkspace();
  const { user, subscriptionTier } = useAuth();
  const isAgencyUser = subscriptionTier === SUBSCRIPTION_TIERS.AGENCY;

  // Fetch agency team for provisioning (only for agency users)
  const { data: teamMembers = [] } = useAgencyTeam(isAgencyUser ? user?.id : null);

  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState(null);

  if (!isOpen && !showProvisionModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!businessName.trim()) {
      setError('Please enter a business name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: createError } = await createWorkspace(businessName.trim());

      if (createError) {
        setError(createError);
        return;
      }

      // Success - check if agency user with team members
      if (isAgencyUser && teamMembers.length > 0 && data) {
        // Show provision modal
        setNewWorkspace(data);
        setShowProvisionModal(true);
        setBusinessName('');
      } else {
        // Regular close
        setBusinessName('');
        onClose();
      }
    } catch (err) {
      setError('Failed to create business. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleProvisionClose = () => {
    setShowProvisionModal(false);
    setNewWorkspace(null);
    onClose();
  };

  // Show provision modal if active
  if (showProvisionModal && newWorkspace) {
    return (
      <WorkspaceTeamProvisionModal
        isOpen={true}
        onClose={handleProvisionClose}
        workspace={newWorkspace}
        teamMembers={teamMembers}
        userId={user?.id}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add New Business</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p className="modal-description">
              Each business gets its own social media accounts, posts, and schedule.
            </p>

            <div className="form-group">
              <label htmlFor="businessName">Business Name</label>
              <input
                type="text"
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Kerr's Tyres, My Coffee Shop"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading || !businessName.trim()}
            >
              {loading ? 'Creating...' : 'Create Business'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
