import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { user, loading, profile } = useAuth();

  // Optimistic loading: if we have cached profile, show content immediately
  // The auth will verify in the background
  const hasCachedData = !!profile;

  // Only show loading if no cached data AND still loading
  if (loading && !hasCachedData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid #333',
          borderTop: '3px solid #7c3aed',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If done loading and no user, redirect to login
  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  // Show content if we have cached data OR if user is authenticated
  if (hasCachedData || user) {
    return children;
  }

  // Fallback: redirect to login
  return <Navigate to="/login" replace />;
};
