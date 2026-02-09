import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { baseURL } from '../utils/constants';
import './GetStarted.css';

const TOTAL_STEPS = 6;

const PLAN_OPTIONS = [
  { id: 'solo', name: 'Solo', price: '£35', period: '/month', desc: '1 workspace, 1 member' },
  { id: 'pro', name: 'Pro', price: '£50', period: '/month', desc: '1 workspace, up to 3 members' },
  { id: 'pro-plus', name: 'Pro Plus', price: '£115', period: '/month', desc: 'Up to 4 workspaces, unlimited members' },
  { id: 'agency', name: 'Agency', price: '£288', period: '/month', desc: 'Unlimited workspaces & members' },
];

const GOAL_OPTIONS = [
  { id: 'schedule-posts', label: 'Schedule and automate social media posts' },
  { id: 'manage-brands', label: 'Manage multiple brands or clients' },
  { id: 'team-collab', label: 'Collaborate with my team' },
  { id: 'analytics', label: 'Track analytics and grow my audience' },
];

const SOCIAL_ACCOUNT_OPTIONS = [
  { value: '1-3', label: '1-3 accounts' },
  { value: '4-10', label: '4-10 accounts' },
  { value: '10+', label: '10+ accounts' },
];

const TEAM_SIZE_OPTIONS = [
  { value: 'solo', label: 'Just me (solo)' },
  { value: 'small', label: 'Small team (2-3 people)' },
  { value: 'medium', label: 'Medium team (4-10 people)' },
  { value: 'large', label: 'Large team (10+ people)' },
];

const WORKSPACE_OPTIONS = [
  { value: '1', label: '1 brand' },
  { value: '2-4', label: '2-4 brands' },
  { value: '5+', label: '5+ brands' },
];

const PLAN_NAMES = {
  'solo': 'Solo',
  'pro': 'Pro',
  'pro-plus': 'Pro Plus',
  'agency': 'Agency',
};

function calculateRecommendedPlan(answers) {
  let score = 0;

  if (answers.goals.includes('manage-brands')) score += 20;
  if (answers.goals.includes('team-collab')) score += 15;
  if (answers.goals.includes('analytics')) score += 10;

  if (answers.socialAccounts === '1-3') score += 5;
  if (answers.socialAccounts === '4-10') score += 15;
  if (answers.socialAccounts === '10+') score += 25;

  if (answers.teamSize === 'small') score += 10;
  if (answers.teamSize === 'medium') score += 20;
  if (answers.teamSize === 'large') score += 25;

  if (answers.workspaces === '1') score += 5;
  if (answers.workspaces === '2-4') score += 15;
  if (answers.workspaces === '5+') score += 25;

  if (score <= 15) return 'solo';
  if (score <= 30) return 'pro';
  if (score <= 50) return 'pro-plus';
  return 'agency';
}

const SESSION_KEY = 'getStartedWizard';

function saveToSession(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

function loadFromSession() {
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (e) {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export default function GetStarted() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [alert, setAlert] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Step 1: Account info
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [emailChecking, setEmailChecking] = useState(false);

  // Step 2: Workspace
  const [workspaceName, setWorkspaceName] = useState('');

  // Step 3: Questionnaire
  const [goals, setGoals] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [workspaces, setWorkspaces] = useState('');

  // Step 4: Plan selection
  const [selectedTier, setSelectedTier] = useState('');
  const [recommendedTier, setRecommendedTier] = useState('');

  // Load session & URL params on mount
  useEffect(() => {
    const saved = loadFromSession();
    if (saved) {
      if (saved.fullName) setFullName(saved.fullName);
      if (saved.email) setEmail(saved.email);
      if (saved.workspaceName) setWorkspaceName(saved.workspaceName);
      if (saved.goals) setGoals(saved.goals);
      if (saved.socialAccounts) setSocialAccounts(saved.socialAccounts);
      if (saved.teamSize) setTeamSize(saved.teamSize);
      if (saved.workspaces) setWorkspaces(saved.workspaces);
      if (saved.selectedTier) setSelectedTier(saved.selectedTier);
      if (saved.recommendedTier) setRecommendedTier(saved.recommendedTier);
    }

    // URL params
    const planParam = searchParams.get('plan');
    if (planParam && PLAN_OPTIONS.some(p => p.id === planParam)) {
      setSelectedTier(planParam);
    }

    const stepParam = searchParams.get('step');
    if (stepParam) {
      const step = parseInt(stepParam, 10);
      if (step >= 1 && step <= 4) setCurrentStep(step);
    }

    if (searchParams.get('payment') === 'cancelled') {
      setAlert({ type: 'info', message: 'Payment was cancelled. You can try again when ready.' });
      setCurrentStep(4);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save to session when data changes
  useEffect(() => {
    saveToSession({
      fullName, email, workspaceName,
      goals, socialAccounts, teamSize, workspaces,
      selectedTier, recommendedTier,
    });
  }, [fullName, email, workspaceName, goals, socialAccounts, teamSize, workspaces, selectedTier, recommendedTier]);

  // Clear alert after 5s
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  // --- Validation ---
  const clearFieldError = (field) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateStep1 = () => {
    const errors = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required';
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!workspaceName.trim()) errors.workspaceName = 'Workspace name is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateStep3 = () => {
    if (goals.length === 0) {
      setAlert({ type: 'error', message: 'Please select at least one goal' });
      return false;
    }
    if (!socialAccounts) {
      setAlert({ type: 'error', message: 'Please select how many social accounts you manage' });
      return false;
    }
    if (!teamSize) {
      setAlert({ type: 'error', message: 'Please select your team size' });
      return false;
    }
    if (!workspaces) {
      setAlert({ type: 'error', message: 'Please select how many workspaces you need' });
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!selectedTier) {
      setAlert({ type: 'error', message: 'Please select a plan' });
      return false;
    }
    return true;
  };

  // --- Email blur validation ---
  const handleEmailBlur = useCallback(async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

    setEmailChecking(true);
    try {
      const response = await fetch(`${baseURL}/api/onboarding/validate-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const result = await response.json();
      const available = result.data?.available ?? result.available;
      if (!available) {
        setFieldErrors(prev => ({ ...prev, email: 'This email is already registered' }));
      }
    } catch (error) {
      console.error('Email validation error:', error);
    } finally {
      setEmailChecking(false);
    }
  }, [email]);

  // --- Account creation + checkout ---
  const createAccountAndCheckout = async () => {
    try {
      setProcessing(true);
      setCurrentStep(5);

      // Create account
      const accountRes = await fetch(`${baseURL}/api/onboarding/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          workspaceName: workspaceName.trim(),
          questionnaireAnswers: { goals, socialAccounts, teamSize, workspaces },
          selectedTier,
        }),
      });

      const accountData = await accountRes.json();
      if (!accountRes.ok) {
        throw new Error(accountData.message || accountData.error || 'Failed to create account');
      }

      const { userId, workspaceId } = accountData;

      // Create Stripe checkout
      const checkoutRes = await fetch(`${baseURL}/api/onboarding/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          workspaceId,
          tier: selectedTier,
          email: email.trim(),
          fullName: fullName.trim(),
        }),
      });

      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        throw new Error(checkoutData.message || checkoutData.error || 'Failed to create checkout session');
      }

      // Move to step 6 and redirect to Stripe
      setCurrentStep(6);
      setTimeout(() => {
        clearSession();
        window.location.href = checkoutData.checkoutUrl;
      }, 1500);

    } catch (error) {
      console.error('Error:', error);
      setAlert({ type: 'error', message: error.message || 'Something went wrong. Please try again.' });
      setCurrentStep(4);
      setProcessing(false);
    }
  };

  // --- Navigation ---
  const handleNext = async () => {
    setAlert(null);
    setFieldErrors({});

    let isValid = false;
    switch (currentStep) {
      case 1: isValid = validateStep1(); break;
      case 2: isValid = validateStep2(); break;
      case 3: isValid = validateStep3(); break;
      case 4: isValid = validateStep4(); break;
      default: isValid = true;
    }

    if (!isValid) return;

    // After questionnaire, calculate recommendation
    if (currentStep === 3) {
      const rec = calculateRecommendedPlan({ goals, socialAccounts, teamSize, workspaces });
      setRecommendedTier(rec);
      if (!selectedTier) setSelectedTier(rec);
    }

    // Step 4 → create account + payment
    if (currentStep === 4) {
      await createAccountAndCheckout();
      return;
    }

    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setAlert(null);
    setFieldErrors({});
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // --- Goal toggle ---
  const toggleGoal = (goalId) => {
    setGoals(prev =>
      prev.includes(goalId) ? prev.filter(g => g !== goalId) : [...prev, goalId]
    );
  };

  // --- Render helpers ---
  const renderProgressBar = () => (
    <div className="wizard-progress">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const step = i + 1;
        let className = 'progress-dot';
        if (step < currentStep) className += ' completed';
        else if (step === currentStep) className += ' active';
        return (
          <div key={step} className={className}>
            {step < currentStep ? '\u2713' : step}
          </div>
        );
      })}
    </div>
  );

  const renderStep1 = () => (
    <>
      <h2 className="wizard-step-title">Let's start with your details</h2>
      <p className="wizard-step-subtitle">We'll use this to create your account</p>

      <div className="wizard-form-group">
        <label className="wizard-label" htmlFor="gs-fullName">Full Name *</label>
        <input
          id="gs-fullName"
          type="text"
          className={`wizard-input${fieldErrors.fullName ? ' has-error' : ''}`}
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => { setFullName(e.target.value); clearFieldError('fullName'); }}
        />
        {fieldErrors.fullName && <p className="wizard-field-error">{fieldErrors.fullName}</p>}
      </div>

      <div className="wizard-form-group">
        <label className="wizard-label" htmlFor="gs-email">Email Address *</label>
        <input
          id="gs-email"
          type="email"
          className={`wizard-input${fieldErrors.email ? ' has-error' : ''}`}
          placeholder="john@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearFieldError('email'); }}
          onBlur={handleEmailBlur}
        />
        {emailChecking && <p className="wizard-helper-text">Checking availability...</p>}
        {fieldErrors.email && <p className="wizard-field-error">{fieldErrors.email}</p>}
      </div>

      <div className="wizard-form-group">
        <label className="wizard-label" htmlFor="gs-password">Password *</label>
        <input
          id="gs-password"
          type="password"
          className={`wizard-input${fieldErrors.password ? ' has-error' : ''}`}
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearFieldError('password'); }}
        />
        {fieldErrors.password && <p className="wizard-field-error">{fieldErrors.password}</p>}
      </div>

      <div className="wizard-form-group">
        <label className="wizard-label" htmlFor="gs-confirmPassword">Confirm Password *</label>
        <input
          id="gs-confirmPassword"
          type="password"
          className={`wizard-input${fieldErrors.confirmPassword ? ' has-error' : ''}`}
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword'); }}
        />
        {fieldErrors.confirmPassword && <p className="wizard-field-error">{fieldErrors.confirmPassword}</p>}
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      <h2 className="wizard-step-title">Name your workspace</h2>
      <p className="wizard-step-subtitle">This is your brand or company name</p>

      <div className="wizard-form-group">
        <label className="wizard-label" htmlFor="gs-workspace">Workspace / Brand Name *</label>
        <input
          id="gs-workspace"
          type="text"
          className={`wizard-input${fieldErrors.workspaceName ? ' has-error' : ''}`}
          placeholder="My Awesome Brand"
          value={workspaceName}
          onChange={(e) => { setWorkspaceName(e.target.value); clearFieldError('workspaceName'); }}
        />
        {fieldErrors.workspaceName && <p className="wizard-field-error">{fieldErrors.workspaceName}</p>}
      </div>

      <p className="wizard-helper-text">
        You can create additional workspaces later depending on your plan.
      </p>
    </>
  );

  const renderStep3 = () => (
    <>
      <h2 className="wizard-step-title">Help us recommend the best plan</h2>
      <p className="wizard-step-subtitle">Answer a few quick questions</p>

      <div className="wizard-form-group">
        <label className="wizard-label">What's your primary goal? *</label>
        <div className="wizard-option-group">
          {GOAL_OPTIONS.map(goal => (
            <div
              key={goal.id}
              className={`wizard-option${goals.includes(goal.id) ? ' selected' : ''}`}
              onClick={() => toggleGoal(goal.id)}
            >
              <input
                type="checkbox"
                checked={goals.includes(goal.id)}
                onChange={() => toggleGoal(goal.id)}
              />
              <span className="wizard-option-label">{goal.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-form-group">
        <label className="wizard-label">How many social accounts do you manage? *</label>
        <div className="wizard-option-group">
          {SOCIAL_ACCOUNT_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`wizard-option${socialAccounts === opt.value ? ' selected' : ''}`}
              onClick={() => setSocialAccounts(opt.value)}
            >
              <input
                type="radio"
                name="socialAccounts"
                checked={socialAccounts === opt.value}
                onChange={() => setSocialAccounts(opt.value)}
              />
              <span className="wizard-option-label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-form-group">
        <label className="wizard-label">Do you work with a team? *</label>
        <div className="wizard-option-group">
          {TEAM_SIZE_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`wizard-option${teamSize === opt.value ? ' selected' : ''}`}
              onClick={() => setTeamSize(opt.value)}
            >
              <input
                type="radio"
                name="teamSize"
                checked={teamSize === opt.value}
                onChange={() => setTeamSize(opt.value)}
              />
              <span className="wizard-option-label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="wizard-form-group">
        <label className="wizard-label">How many brands/workspaces do you need? *</label>
        <div className="wizard-option-group">
          {WORKSPACE_OPTIONS.map(opt => (
            <div
              key={opt.value}
              className={`wizard-option${workspaces === opt.value ? ' selected' : ''}`}
              onClick={() => setWorkspaces(opt.value)}
            >
              <input
                type="radio"
                name="workspaces"
                checked={workspaces === opt.value}
                onChange={() => setWorkspaces(opt.value)}
              />
              <span className="wizard-option-label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderStep4 = () => (
    <>
      <h2 className="wizard-step-title">Choose your plan</h2>
      {recommendedTier && (
        <p className="wizard-recommendation">
          Based on your answers, we recommend the <strong>{PLAN_NAMES[recommendedTier]}</strong> plan
        </p>
      )}

      <div className="wizard-option-group">
        {PLAN_OPTIONS.map(plan => (
          <div
            key={plan.id}
            className={`wizard-option${selectedTier === plan.id ? ' selected' : ''}`}
            onClick={() => setSelectedTier(plan.id)}
          >
            <input
              type="radio"
              name="selectedPlan"
              checked={selectedTier === plan.id}
              onChange={() => setSelectedTier(plan.id)}
            />
            <div className="wizard-option-details">
              <div className="wizard-option-name">
                {plan.name} - {plan.price}{plan.period}
              </div>
              <div className="wizard-option-desc">{plan.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  const renderStep5 = () => (
    <div className="wizard-processing">
      <h2 className="wizard-step-title">Creating your account...</h2>
      <div className="wizard-spinner" />
      <p className="wizard-processing-text">Please wait while we set everything up for you</p>
    </div>
  );

  const renderStep6 = () => (
    <div className="wizard-processing">
      <h2 className="wizard-step-title">Complete your subscription</h2>
      <p className="wizard-processing-text" style={{ marginBottom: '16px' }}>
        Redirecting to secure payment...
      </p>
      <div className="wizard-spinner" />
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      case 6: return renderStep6();
      default: return null;
    }
  };

  const showNav = currentStep >= 1 && currentStep <= 4;
  const showPrev = currentStep > 1 && currentStep <= 4;
  const nextLabel = currentStep === 4 ? 'Continue to Payment' : 'Next';

  return (
    <div className="getstarted-container">
      <div className="getstarted-header">
        <Link to="/" className="getstarted-logo">Woozy Social</Link>
      </div>

      <div className="wizard-card">
        <h1 className="wizard-title">Create Your Account</h1>

        {renderProgressBar()}

        {alert && (
          <div className={`wizard-alert ${alert.type}`}>
            {alert.message}
          </div>
        )}

        {renderCurrentStep()}

        {showNav && (
          <div className="wizard-actions">
            {showPrev ? (
              <button
                type="button"
                className="wizard-btn wizard-btn-secondary"
                onClick={handlePrev}
                disabled={processing}
              >
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              className="wizard-btn wizard-btn-primary"
              onClick={handleNext}
              disabled={processing || emailChecking}
            >
              {nextLabel}
            </button>
          </div>
        )}

        {currentStep === 1 && (
          <div className="wizard-login-link">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
