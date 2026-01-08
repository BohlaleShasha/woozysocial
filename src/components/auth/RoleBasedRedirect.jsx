import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export const RoleBasedRedirect = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isClientRole, loading } = useWorkspace();

  useEffect(() => {
    // Don't redirect while loading or if already on client routes
    if (loading) return;

    const isOnClientRoute = location.pathname.startsWith('/client');
    const isOnMainRoute = !isOnClientRoute && location.pathname !== '/login' && location.pathname !== '/signup';

    // If user is a client but trying to access main routes, redirect to client portal
    if (isClientRole && isOnMainRoute) {
      navigate('/client/dashboard', { replace: true });
    }

    // If user is NOT a client but trying to access client routes, redirect to main dashboard
    if (!isClientRole && isOnClientRoute) {
      navigate('/dashboard', { replace: true });
    }
  }, [isClientRole, loading, location.pathname, navigate]);

  return children;
};
