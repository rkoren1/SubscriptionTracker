import { useEffect, useMemo, useState } from 'react';
import './App.css';
import AuthPage from './AuthPage.jsx';

const emptyForm = {
  id: '',
  name: '',
  category: 'Entertainment',
  price: '9.99',
  currency: 'USD',
  billingCycle: 'Monthly',
  nextBillingDate: new Date().toISOString().slice(0, 10),
  isActive: true,
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5283';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const summary = useMemo(() => {
    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.isActive,
    );

    const yearlyTotal = activeSubscriptions.reduce((sum, item) => {
      const multiplier =
        item.billingCycle === 'Weekly'
          ? 52
          : item.billingCycle === 'Monthly'
            ? 12
            : item.billingCycle === 'Quarterly'
              ? 4
              : 1;

      return sum + Number(item.price) * multiplier;
    }, 0);

    const estimatedMonthlySpend = activeSubscriptions.reduce((sum, item) => {
      const monthlyEquivalent =
        item.billingCycle === 'Weekly'
          ? Number(item.price) * 4.333
          : item.billingCycle === 'Quarterly'
            ? Number(item.price) / 3
            : item.billingCycle === 'Yearly'
              ? Number(item.price) / 12
              : Number(item.price);

      return sum + monthlyEquivalent;
    }, 0);

    return {
      activeCount: activeSubscriptions.length,
      yearlyTotal,
      estimatedMonthlySpend,
    };
  }, [subscriptions]);

  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to load subscriptions');
      }

      const data = await response.json();
      setSubscriptions(data);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const sessionResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include',
        });
        if (!sessionResponse.ok) return;

        const user = await sessionResponse.json();
        if (cancelled) return;
        setCurrentUser(user);

        const subscriptionResponse = await fetch(
          `${API_BASE_URL}/api/subscriptions`,
          {
            credentials: 'include',
          },
        );
        if (!subscriptionResponse.ok) {
          throw new Error('Unable to load subscriptions.');
        }

        const data = await subscriptionResponse.json();
        if (!cancelled) setSubscriptions(data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsCheckingSession(false);
        }
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAuthenticated = async (user) => {
    setCurrentUser(user);
    setError('');
    setSuccess('');
    await fetchSubscriptions();
  };

  const handleLogout = async () => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {});
    setCurrentUser(null);
    setSubscriptions([]);
    resetForm();
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const payload = {
      ...form,
      price: Number(form.price),
      nextBillingDate: form.nextBillingDate,
      isActive: form.isActive,
      billingCycle: form.billingCycle,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/subscriptions${isEditing ? `/${form.id}` : ''}`,
        {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'The operation failed.');
      }

      await fetchSubscriptions();
      resetForm();
      setSuccess(
        isEditing
          ? 'Subscription updated successfully.'
          : 'Subscription added successfully.',
      );
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (subscription) => {
    setForm({
      id: subscription.id,
      name: subscription.name,
      category: subscription.category,
      price: String(subscription.price),
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate,
      isActive: subscription.isActive,
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to delete subscription');
      }

      await fetchSubscriptions();
      if (form.id === id) {
        resetForm();
      }
      setSuccess('Subscription removed.');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  if (isCheckingSession) {
    return (
      <main className="auth-loading" aria-label="Loading account">
        Loading...
      </main>
    );
  }

  if (!currentUser) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Subscription Tracker</h1>
        </div>
        <div className="topbar-actions">
          <span className="user-greeting">{currentUser.displayName}</span>
          <button type="button" className="ghost-button" onClick={resetForm}>
            New subscription
          </button>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="summary-grid">
        <article className="metric-card">
          <span>Active plans</span>
          <strong>{summary.activeCount}</strong>
        </article>
        <article className="metric-card">
          <span>Estimated monthly</span>
          <strong>${summary.estimatedMonthlySpend.toFixed(2)}</strong>
        </article>
        <article className="metric-card accent">
          <span>Yearly total</span>
          <strong>${summary.yearlyTotal.toFixed(2)}</strong>
        </article>
      </section>

      <main className="content-grid">
        <section className="panel form-panel">
          <h2>{isEditing ? 'Edit subscription' : 'Add a subscription'}</h2>

          <form onSubmit={handleSubmit} className="subscription-form">
            <label>
              Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Netflix"
                required
              />
            </label>

            <div className="two-column">
              <label>
                Category
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                />
              </label>

              <label>
                Currency
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </label>
            </div>

            <div className="two-column">
              <label>
                Price
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Billing cycle
                <select
                  name="billingCycle"
                  value={form.billingCycle}
                  onChange={handleChange}
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </label>
            </div>

            <div className="two-column">
              <label>
                Next billing
                <input
                  name="nextBillingDate"
                  type="date"
                  value={form.nextBillingDate}
                  onChange={handleChange}
                />
              </label>

              <label className="checkbox-inline">
                <input
                  name="isActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={handleChange}
                />
                Active
              </label>
            </div>

            {(error || success) && (
              <p className={error ? 'message error' : 'message success'}>
                {error || success}
              </p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Save'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel list-panel">
          <h2>Subscriptions</h2>

          {isLoading ? (
            <p className="empty-state">Loading subscriptions...</p>
          ) : subscriptions.length === 0 ? (
            <p className="empty-state">
              No subscriptions yet. Add your first plan.
            </p>
          ) : (
            <div className="subscription-list">
              {subscriptions.map((subscription) => (
                <article key={subscription.id} className="subscription-card">
                  <div className="subscription-header">
                    <div>
                      <h3>{subscription.name}</h3>
                      <p>{subscription.category}</p>
                    </div>
                    <span
                      className={`status ${subscription.isActive ? 'active' : 'inactive'}`}
                    >
                      {subscription.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>

                  <div className="subscription-meta">
                    <strong>
                      {subscription.currency}{' '}
                      {Number(subscription.price).toFixed(2)}
                    </strong>
                    <span>{subscription.billingCycle}</span>
                  </div>

                  <div className="subscription-footer">
                    <small>Next billing: {subscription.nextBillingDate}</small>
                    <div className="card-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleEdit(subscription)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => handleDelete(subscription.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
