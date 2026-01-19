import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../components/auth/AuthPages.css';

export default function TokenLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { supabase } = useAuth();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('validating');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      navigate('/login?error=missing_token');
      return;
    }

    validateTokenAndLogin(token);
  }, [searchParams]);

  async function validateTokenAndLogin(token) {
    try {
      setStatus('validating');
      console.log('[TOKEN LOGIN] Validating token...');

      // Call backend to validate token
      const response = await fetch('/api/auth/token-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error('[TOKEN LOGIN] Validation failed:', data);
        setError(data.error || 'Invalid token');
        setTimeout(() => {
          navigate('/login?error=invalid_token');
        }, 2000);
        return;
      }

      console.log('[TOKEN LOGIN] Token validated, creating session...');
      setStatus('creating_session');

      // Use the magic link to sign in
      // The backend returns a magic link token we can use
      if (data.data.session && data.data.session.hashed_token) {
        // Sign in with the token hash
        const { error: signInError } = await supabase.auth.verifyOtp({
          token_hash: data.data.session.hashed_token,
          type: 'magiclink'
        });

        if (signInError) {
          console.error('[TOKEN LOGIN] Sign in error:', signInError);
          setError('Failed to create session');
          setTimeout(() => {
            navigate('/login?error=session_error');
          }, 2000);
          return;
        }
      } else {
        // Fallback: Try to get session from user data
        console.log('[TOKEN LOGIN] Using fallback auth method');

        // The token is validated, user exists, just redirect
        // The auth context will pick up the session
        setStatus('redirecting');
        setTimeout(() => {
          window.location.href = '/dashboard?welcome=true';
        }, 1000);
        return;
      }

      console.log('[TOKEN LOGIN] Session created successfully');
      setStatus('success');

      // Redirect to dashboard with welcome message
      setTimeout(() => {
        window.location.href = '/dashboard?welcome=true';
      }, 1000);

    } catch (err) {
      console.error('[TOKEN LOGIN] Error:', err);
      setError('Something went wrong');
      setTimeout(() => {
        navigate('/login?error=token_error');
      }, 2000);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Woozy Social</h1>
          </div>

          <div className="auth-body" style={{ textAlign: 'center', padding: '2rem' }}>
            {error ? (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                <h2 style={{ marginBottom: '1rem', color: '#ef4444' }}>Authentication Failed</h2>
                <p style={{ color: '#6b7280' }}>{error}</p>
                <p style={{ color: '#6b7280', marginTop: '1rem', fontSize: '0.875rem' }}>
                  Redirecting to login...
                </p>
              </>
            ) : (
              <>
                <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>

                {status === 'validating' && (
                  <>
                    <h2 style={{ marginBottom: '0.5rem' }}>Validating your login...</h2>
                    <p style={{ color: '#6b7280' }}>Please wait a moment</p>
                  </>
                )}

                {status === 'creating_session' && (
                  <>
                    <h2 style={{ marginBottom: '0.5rem' }}>Creating your session...</h2>
                    <p style={{ color: '#6b7280' }}>Almost there!</p>
                  </>
                )}

                {status === 'success' && (
                  <>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                    <h2 style={{ marginBottom: '0.5rem', color: '#10b981' }}>Success!</h2>
                    <p style={{ color: '#6b7280' }}>Redirecting to your dashboard...</p>
                  </>
                )}

                {status === 'redirecting' && (
                  <>
                    <h2 style={{ marginBottom: '0.5rem' }}>Logging you in...</h2>
                    <p style={{ color: '#6b7280' }}>Taking you to your dashboard...</p>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
