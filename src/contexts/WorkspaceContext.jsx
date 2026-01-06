import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../utils/supabaseClient';
import { baseURL } from '../utils/constants';

const WorkspaceContext = createContext({});

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export const WorkspaceProvider = ({ children }) => {
  const { user } = useAuth();
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [userWorkspaces, setUserWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workspaceMembership, setWorkspaceMembership] = useState(null);

  // Fetch user's workspaces via API
  const fetchUserWorkspaces = useCallback(async () => {
    if (!user) {
      setUserWorkspaces([]);
      setActiveWorkspace(null);
      setWorkspaceMembership(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First, try to get workspaces via API
      const listRes = await fetch(`${baseURL}/api/workspace/list?userId=${user.id}`);
      const listData = await listRes.json();

      let workspaces = listData.workspaces || [];

      // If no workspaces, auto-migrate the user
      if (workspaces.length === 0) {
        console.log('No workspaces found, migrating user...');
        const migrateRes = await fetch(`${baseURL}/api/workspace/migrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        const migrateData = await migrateRes.json();

        if (migrateData.success && migrateData.workspace) {
          workspaces = [{
            ...migrateData.workspace,
            membership: { role: 'owner' }
          }];
        }
      }

      setUserWorkspaces(workspaces);

      // Set active workspace
      if (workspaces.length > 0) {
        const lastWorkspace = workspaces.find(w => w.id === listData.lastWorkspaceId);
        const workspace = lastWorkspace || workspaces[0];

        setActiveWorkspace(workspace);
        setWorkspaceMembership(workspace.membership || { role: 'owner' });
      } else {
        setActiveWorkspace(null);
        setWorkspaceMembership(null);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
      setUserWorkspaces([]);
      setActiveWorkspace(null);
      setWorkspaceMembership(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch workspaces when user changes
  useEffect(() => {
    fetchUserWorkspaces();
  }, [fetchUserWorkspaces]);

  // Switch workspace
  const switchWorkspace = useCallback(async (workspaceId) => {
    try {
      const workspace = userWorkspaces.find(w => w.id === workspaceId);
      if (!workspace) {
        console.error('Workspace not found:', workspaceId);
        return { error: 'Workspace not found' };
      }

      // Update state immediately for responsive UI
      setActiveWorkspace(workspace);
      setWorkspaceMembership(workspace.membership);

      // Save preference to database (async, non-blocking)
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ last_workspace_id: workspaceId })
          .eq('id', user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Error switching workspace:', error);
      return { error: error.message };
    }
  }, [userWorkspaces, user]);

  // Create workspace via API (also creates Ayrshare profile)
  const createWorkspace = useCallback(async (businessName) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const res = await fetch(`${baseURL}/api/workspace/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          businessName: businessName
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create workspace');
      }

      // Refresh workspaces and switch to the new one
      await fetchUserWorkspaces();

      // Switch to the new workspace
      if (data.workspace) {
        setActiveWorkspace({
          ...data.workspace,
          membership: { role: 'owner' }
        });
        setWorkspaceMembership({ role: 'owner' });
      }

      return { data: data.workspace, error: null };
    } catch (error) {
      console.error('Error creating workspace:', error);
      return { data: null, error: error.message };
    }
  }, [user, fetchUserWorkspaces]);

  // Update workspace
  const updateWorkspace = useCallback(async (workspaceId, updates) => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId);

      if (error) throw error;

      // Refresh workspaces to get updated data
      await fetchUserWorkspaces();

      return { error: null };
    } catch (error) {
      console.error('Error updating workspace:', error);
      return { error: error.message };
    }
  }, [fetchUserWorkspaces]);

  // Invite user to workspace
  const inviteToWorkspace = useCallback(async (workspaceId, email, role = 'member') => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      // Check if user has permission to invite
      const membership = userWorkspaces.find(w => w.id === workspaceId)?.membership;
      if (!membership || !membership.permissions.canManageTeam) {
        return { data: null, error: 'You do not have permission to invite members' };
      }

      // Generate invitation token
      const invitationToken = `${workspaceId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Create invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          invited_by: user.id,
          invitation_token: invitationToken,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        })
        .select()
        .single();

      if (invitationError) throw invitationError;

      // TODO: Send invitation email
      console.log('Invitation created:', invitation);
      console.log('TODO: Send invitation email to:', email);

      return { data: invitation, error: null };
    } catch (error) {
      console.error('Error inviting to workspace:', error);
      return { data: null, error: error.message };
    }
  }, [user, userWorkspaces]);

  // Remove member from workspace
  const removeMember = useCallback(async (workspaceId, memberId) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Check if user has permission to remove members
      const membership = userWorkspaces.find(w => w.id === workspaceId)?.membership;
      if (!membership || !membership.permissions.canManageTeam) {
        return { error: 'You do not have permission to remove members' };
      }

      // Cannot remove yourself
      if (memberId === user.id) {
        return { error: 'You cannot remove yourself from the workspace' };
      }

      // Remove member
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', memberId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error removing member:', error);
      return { error: error.message };
    }
  }, [user, userWorkspaces]);

  // Update member role
  const updateMemberRole = useCallback(async (workspaceId, memberId, role, permissions = {}) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      // Check if user has permission to update members
      const membership = userWorkspaces.find(w => w.id === workspaceId)?.membership;
      if (!membership || !membership.permissions.canManageTeam) {
        return { error: 'You do not have permission to update members' };
      }

      // Cannot change your own role
      if (memberId === user.id) {
        return { error: 'You cannot change your own role' };
      }

      // Update member
      const { error } = await supabase
        .from('workspace_members')
        .update({
          role,
          can_manage_team: permissions.canManageTeam !== undefined ? permissions.canManageTeam : false,
          can_manage_settings: permissions.canManageSettings !== undefined ? permissions.canManageSettings : false,
          can_delete_posts: permissions.canDeletePosts !== undefined ? permissions.canDeletePosts : true
        })
        .eq('workspace_id', workspaceId)
        .eq('user_id', memberId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error updating member role:', error);
      return { error: error.message };
    }
  }, [user, userWorkspaces]);

  // Check if user can perform an action
  const canPerformAction = useCallback((action) => {
    if (!workspaceMembership) return false;

    switch (action) {
      case 'manageTeam':
        return workspaceMembership.permissions.canManageTeam;
      case 'manageSettings':
        return workspaceMembership.permissions.canManageSettings;
      case 'deletePosts':
        return workspaceMembership.permissions.canDeletePosts;
      case 'isOwner':
        return workspaceMembership.role === 'owner';
      case 'isAdmin':
        return workspaceMembership.role === 'owner' || workspaceMembership.role === 'admin';
      default:
        return false;
    }
  }, [workspaceMembership]);

  const value = {
    activeWorkspace,
    userWorkspaces,
    workspaceMembership,
    loading,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    inviteToWorkspace,
    removeMember,
    updateMemberRole,
    canPerformAction,
    refreshWorkspaces: fetchUserWorkspaces
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};
