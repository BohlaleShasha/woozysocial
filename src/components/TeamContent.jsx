import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { InviteMemberModal } from "./InviteMemberModal";
import { supabase } from "../utils/supabaseClient";
import "./TeamContent.css";

export const TeamContent = () => {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers();
    }
  }, [user]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team members:', error);
      } else {
        setTeamMembers(data || []);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = () => {
    setIsModalOpen(true);
  };

  const handleInvite = async (inviteData) => {
    try {
      // Call the server API to send invitation
      const response = await fetch('http://localhost:3001/api/send-team-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteData.email,
          role: inviteData.role,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      console.log('Invitation sent successfully:', data);
      // The modal will close automatically on success
    } catch (error) {
      console.error('Error in handleInvite:', error);
      // Re-throw the error so the modal can display it
      throw error;
    }
  };

  return (
    <div className="team-container">
      <div className="team-header">
        <h1 className="team-title">Team</h1>
        <p className="team-subtitle">Manage your team members and permissions</p>
      </div>

      <div className="team-section">
        <div className="section-header">
          <div>
            <h2 className="section-title">Team Members</h2>
            <p className="section-subtitle">Invite and manage your team collaborators</p>
          </div>
          <button className="add-member-button" onClick={handleAddMember}>
            + Add Member
          </button>
        </div>

        <div className="team-content">
          <div className="members-list">
            {loading ? (
              <div className="team-info-box">
                <p className="info-text">Loading team members...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="team-info-box">
                <p className="info-text">No team members yet</p>
                <p className="info-subtext">
                  Click "+ Add Member" to invite your first team member
                </p>
              </div>
            ) : (
              teamMembers.map((member) => {
                const getInitials = (email) => {
                  return email.substring(0, 2).toUpperCase();
                };

                const getRoleLabel = (role) => {
                  const labels = {
                    admin: 'Admin',
                    editor: 'Editor',
                    view_only: 'View Only',
                  };
                  return labels[role] || role;
                };

                return (
                  <div key={member.id} className="member-card">
                    <div className="member-info">
                      <div className="member-avatar">{getInitials(member.email)}</div>
                      <div className="member-details">
                        <h3 className="member-name">{member.email}</h3>
                        <p className="member-email">Joined {new Date(member.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="member-actions">
                      <span className="member-role">{getRoleLabel(member.role)}</span>
                      <button className="remove-button">Remove</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <InviteMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInvite={handleInvite}
        currentUserEmail={user?.email}
      />
    </div>
  );
};
