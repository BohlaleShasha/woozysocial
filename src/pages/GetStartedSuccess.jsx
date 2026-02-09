import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { baseURL } from '../utils/constants';
import './GetStarted.css';

export default function GetStartedSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing | success | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setStatus('error');
      setErrorMsg('No session ID found. Please contact support.');
      return;
    }

    completeOnboarding(sessionId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function completeOnboarding(sessionId) {
    try {
      // Call complete-onboarding endpoint (no API key required)
      const response = await fetch(`${baseURL}/api/signup/complete-onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to complete onboarding');
      }

      // Extract login token (exact path from locked code: data.data.loginToken)
      const loginToken = data.data?.loginToken;

      if (loginToken) {
        setStatus('success');
        // Redirect to token-login (existing page handles auto-login)
        setTimeout(() => {
          window.location.href = `${window.location.origin}/auth/token-login?token=${loginToken}`;
        }, 1500);
      } else {
        throw new Error('No login token received from server');
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setStatus('error');
      setErrorMsg(error.message);

      // Fallback: redirect to login after 3s
      setTimeout(() => {
        window.location.href = `${window.location.origin}/login?welcome=true`;
      }, 3000);
    }
  }

  return (
    <div className="getstarted-container">
      <div className="getstarted-header">
        <span className="getstarted-logo">Woozy Social</span>
      </div>

      <div className="wizard-card" style={{ textAlign: 'center' }}>
        {status === 'processing' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h1 className="wizard-title">Welcome to Woozy Social!</h1>
            <p className="wizard-step-subtitle">Your account has been created successfully</p>
            <div className="wizard-spinner" />
            <p className="wizard-processing-text">Setting up your dashboard...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
            <h1 className="wizard-title">Welcome to Woozy Social!</h1>
            <p className="wizard-step-subtitle">Your account has been created successfully</p>
            <div className="wizard-spinner" />
            <p className="wizard-processing-text">Redirecting you to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
            <h1 className="wizard-title">Almost there!</h1>
            <p className="wizard-step-subtitle" style={{ marginBottom: '16px' }}>
              {errorMsg || 'Something went wrong, but your payment was successful.'}
            </p>
            <p className="wizard-processing-text">
              Redirecting you to login...
            </p>
            <div style={{ marginTop: '20px' }}>
              <Link to="/login" className="wizard-btn wizard-btn-primary" style={{ textDecoration: 'none', display: 'inline-block' }}>
                Go to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
