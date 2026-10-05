import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import './AuthPage.css';
import type { AuthUser } from './types';

type AuthMode = 'login' | 'register';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5283';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

async function readResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorData = data as { message?: unknown; title?: unknown };
    const message =
      typeof errorData.message === 'string'
        ? errorData.message
        : typeof errorData.title === 'string'
          ? errorData.title
          : 'Unable to sign in. Please try again.';
    throw new Error(message);
  }
  return data as T;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Unable to sign in. Please try again.';
}

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const onAuthenticatedRef = useRef(onAuthenticated);

  useEffect(() => {
    onAuthenticatedRef.current = onAuthenticated;
  }, [onAuthenticated]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;

    let cancelled = false;
    const renderButton = (): void => {
      const googleIdentity = window.google?.accounts?.id;
      const buttonContainer = googleButtonRef.current;
      if (cancelled || !googleIdentity || !buttonContainer) return;

      buttonContainer.replaceChildren();
      googleIdentity.initialize({
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
            const user = await readResponse<AuthUser>(response);
            await onAuthenticatedRef.current(user);
          } catch (authError: unknown) {
            setError(getErrorMessage(authError));
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      googleIdentity.renderButton(buttonContainer, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        text: 'continue_with',
        width: Math.min(360, buttonContainer.clientWidth || 360),
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

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
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
      const user = await readResponse<AuthUser>(response);
      await onAuthenticated(user);
    } catch (authError: unknown) {
      setError(getErrorMessage(authError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const changeMode = (nextMode: AuthMode): void => {
    setMode(nextMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleDisplayNameChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    setDisplayName(event.currentTarget.value);
  };

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setEmail(event.currentTarget.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setPassword(event.currentTarget.value);
  };

  const handleConfirmPasswordChange = (
    event: ChangeEvent<HTMLInputElement>,
  ): void => {
    setConfirmPassword(event.currentTarget.value);
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
                  onChange={handleDisplayNameChange}
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
                onChange={handleEmailChange}
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
                onChange={handlePasswordChange}
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
                  onChange={handleConfirmPasswordChange}
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
