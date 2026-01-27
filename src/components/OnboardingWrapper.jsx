import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { OnboardingTour } from './OnboardingTour';

/**
 * Wrapper component that shows onboarding tour for new users
 * Shows tour when:
 * 1. User has an active subscription (not free)
 * 2. User hasn't completed onboarding yet
 */
export const OnboardingWrapper = ({ children }) => {
  const { user, profile, hasActiveProfile } = useAuth();
  const [showTour, setShowTour] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Wait for user data to load
    if (!user || !profile) {
      setChecked(true);
      return;
    }

    // Check if user should see onboarding
    const shouldShowTour = () => {
      // Don't show if user doesn't have active profile/subscription
      if (!hasActiveProfile) return false;

      // Check localStorage first (faster)
      const localCompleted = localStorage.getItem('woozy_onboarding_completed');
      if (localCompleted === 'true') return false;

      // Check profile for onboarding_completed flag
      if (profile.onboarding_completed) return false;

      // Show tour for users who haven't completed it
      return true;
    };

    setShowTour(shouldShowTour());
    setChecked(true);
  }, [user, profile, hasActiveProfile]);

  const handleTourComplete = () => {
    setShowTour(false);
  };

  // Don't render anything until we've checked
  if (!checked) return children;

  return (
    <>
      {children}
      {showTour && <OnboardingTour onComplete={handleTourComplete} />}
    </>
  );
};

export default OnboardingWrapper;
