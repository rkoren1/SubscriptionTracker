import { useEffect, useRef, useState } from 'react';
import './AuthPage.css';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5283';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data.message ?? data.title ?? 'Unable to sign in. Please try again.',
    );
  }
  return data;
}

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef(null);
  const onAuthenticatedRef = useRef(onAuthenticated);

  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated;
  }, [onAuthenticated]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;

    let cancelled = false;
    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current)
        return;

      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setError('');
          setIsSubmitting(true);
          try {
            const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ credential }),
            });
            const user = await readResponse(response);
            await onAuthenticatedRef.current(user);
          } catch (authError) {
            setError(authError.message);
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: Math.min(360, googleButtonRef.current.clientWidth || 360),
      });
    };

    const existingScript = document.querySelector(
      'script[data-google-identity]',
    );
    if (window.google?.accounts?.id) {
      renderButton();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderButton, { once: true });
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = 'true';
      script.addEventListener('load', renderButton, { once: true });
      script.addEventListener(
        'error',
        () => {
          if (!cancelled) setError('Google sign-in could not be loaded.');
        },
        { once: true },
      );
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (mode === 'register' && password !== confirmPassword) {
      setError('Those passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'register' ? { displayName } : {}),
        }),
      });
      const user = await readResponse(response);
      await onAuthenticated(user);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <main className="auth-screen">
      <aside className="auth-brand" aria-label="Subscription Tracker">
        <div className="brand-lockup">
          <span className="brand-symbol" aria-hidden="true">
            S
          </span>
          <span>
            Subscription
            <br />
            Tracker
          </span>
        </div>
        <div className="brand-message">
          <span className="brand-kicker">PERSONAL FINANCE</span>
          <h1>
            Keep your
            <br />
            subscriptions
            <br />
            in view.
          </h1>
          <div className="brand-rule" />
          <p>Subscription Tracker</p>
        </div>
        <div className="brand-orbit" aria-hidden="true">
          <span className="orbit-line orbit-line-one" />
          <span className="orbit-line orbit-line-two" />
          <span className="orbit-dot" />
          <span className="orbit-caption">ST / 01</span>
        </div>
        <span className="brand-footer">A quieter way to keep track.</span>
      </aside>

      <section className="auth-panel">
        <div className="auth-panel-inner">
          <div className="auth-heading">
            <span className="auth-kicker">YOUR ACCOUNT</span>
            <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p>
              {mode === 'login'
                ? 'Sign in to continue.'
                : 'Start with your email and a password.'}
            </p>
          </div>

          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'selected' : ''}
              onClick={() => changeMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'register'}
              className={mode === 'register' ? 'selected' : ''}
              onClick={() => changeMode('register')}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'register' && (
              <label>
                Name
                <input
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={100}
                  required
                />
              </label>
            )}
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={256}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                maxLength={128}
                required
              />
            </label>
            {mode === 'register' && (
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  maxLength={128}
                  required
                />
              </label>
            )}

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="auth-divider">
            <span>OR CONTINUE WITH</span>
          </div>

          {GOOGLE_CLIENT_ID ? (
            <div className="google-button" ref={googleButtonRef} />
          ) : (
            <div className="google-unavailable">
              <button
                type="button"
                disabled
                aria-label="Google sign-in is not configured"
              >
                <span className="google-g" aria-hidden="true">
                  G
                </span>
                Continue with Google
              </button>
              <small>Google sign-in needs a configured OAuth client ID.</small>
            </div>
          )}

          <p className="auth-legal">
            By continuing, you agree to use this account for your personal
            subscription records.
          </p>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;
