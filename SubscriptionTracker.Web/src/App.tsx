import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './App.css';
import AuthPage from './AuthPage';
import SpendingChart, {
  type SpendingChartPoint,
} from './components/SpendingChart';
import SubscriptionForm from './components/SubscriptionForm';
import SubscriptionList from './components/SubscriptionList';
import SummaryCards from './components/SummaryCards';
import TopBar from './components/TopBar';
import type {
  AuthUser,
  BillingCycle,
  Subscription,
  SubscriptionForm as SubscriptionFormState,
  SubscriptionRequest,
} from './types';

const emptyForm: SubscriptionFormState = {
  id: '',
  name: '',
  category: 'Entertainment',
  price: '9.99',
  currency: 'USD',
  billingCycle: 1,
  nextBillingDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  isActive: true,
};

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5283';
const LOCAL_STORAGE_KEY = 'subscription-tracker-subscriptions';
const annualMultipliers: Record<BillingCycle, number> = {
  0: 52,
  1: 12,
  2: 4,
  3: 1,
};
const monthlyMultipliers: Record<BillingCycle, number> = {
  0: 4.333,
  1: 1,
  2: 1 / 3,
  3: 1 / 12,
};

function buildSpendingChart(
  subscriptions: Subscription[],
): SpendingChartPoint[] {
  if (subscriptions.length === 0) {
    return [];
  }

  const allCreatedDates = subscriptions
    .map((subscription) => new Date(subscription.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (allCreatedDates.length === 0) {
    return [];
  }

  const earliestMonth = new Date(
    Math.min(...allCreatedDates.map((date) => date.getTime())),
  );
  const startMonth = new Date(
    earliestMonth.getFullYear(),
    earliestMonth.getMonth(),
    1,
  );
  const currentMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );

  const points: SpendingChartPoint[] = [];
  let cumulativeSpend = 0;

  for (
    let cursor = new Date(startMonth);
    cursor <= currentMonth;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  ) {
    const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const monthEnd = new Date(
      cursor.getFullYear(),
      cursor.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const monthlySpend = subscriptions.reduce((sum, subscription) => {
      const createdAt = new Date(subscription.createdAt);
      const endDate = subscription.endDate
        ? new Date(subscription.endDate)
        : null;

      if (createdAt > monthEnd) {
        return sum;
      }

      if (endDate && endDate < monthStart) {
        return sum;
      }

      if (!subscription.isActive && (!endDate || endDate < monthEnd)) {
        return sum;
      }

      return (
        sum + subscription.price * monthlyMultipliers[subscription.billingCycle]
      );
    }, 0);

    const previousMonthlySpend = points[points.length - 1]?.monthlySpend ?? 0;
    cumulativeSpend += monthlySpend;

    const changeFromPrevious = monthlySpend - previousMonthlySpend;
    const changePercent =
      previousMonthlySpend === 0
        ? 0
        : (changeFromPrevious / previousMonthlySpend) * 100;

    points.push({
      monthKey: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`,
      label: cursor.toLocaleString('en-US', {
        month: 'short',
        year: '2-digit',
      }),
      monthlySpend,
      cumulativeSpend,
      changeFromPrevious,
      changePercent,
    });
  }

  return points;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function readLocalSubscriptions(): Subscription[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Subscription[]) : [];
  } catch {
    return [];
  }
}

function writeLocalSubscriptions(subscriptions: Subscription[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subscriptions));
}

async function importLocalSubscriptions(): Promise<void> {
  const localSubscriptions = readLocalSubscriptions();
  if (localSubscriptions.length === 0) return;

  const response = await fetch(`${API_BASE_URL}/api/subscriptions/import`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(localSubscriptions),
  });
  if (!response.ok) {
    throw new Error(
      (await response.text()) || 'Unable to import local subscriptions.',
    );
  }

  localStorage.removeItem(LOCAL_STORAGE_KEY);
}

function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(
    readLocalSubscriptions,
  );
  const [form, setForm] = useState<SubscriptionFormState>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isCheckingSession && !currentUser) {
      writeLocalSubscriptions(subscriptions);
    }
  }, [currentUser, isCheckingSession, subscriptions]);

  const summary = useMemo(() => {
    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.isActive,
    );

    const yearlyTotal = activeSubscriptions.reduce(
      (sum, subscription) =>
        sum + subscription.price * annualMultipliers[subscription.billingCycle],
      0,
    );

    const estimatedMonthlySpend = activeSubscriptions.reduce(
      (sum, subscription) =>
        sum +
        subscription.price * monthlyMultipliers[subscription.billingCycle],
      0,
    );

    return {
      activeCount: activeSubscriptions.length,
      yearlyTotal,
      estimatedMonthlySpend,
    };
  }, [subscriptions]);

  const chartData = useMemo(
    () => buildSpendingChart(subscriptions),
    [subscriptions],
  );

  useEffect(() => {
    if (chartData.length > 0) {
      setSelectedMonthIndex(chartData.length - 1);
    }
  }, [chartData.length]);

  const fetchSubscriptions = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Unable to load subscriptions');
      }

      const data = (await response.json()) as Subscription[];
      setSubscriptions(data);
    } catch (loadError: unknown) {
      setError(errorMessage(loadError, 'Unable to load subscriptions'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async (): Promise<void> => {
      try {
        const sessionResponse = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: 'include',
        }).catch(() => null);
        if (!sessionResponse?.ok) return;

        const user = (await sessionResponse.json()) as AuthUser;
        if (cancelled) return;
        await importLocalSubscriptions();
        if (cancelled) return;
        setCurrentUser(user);
        setIsLoading(true);

        const subscriptionResponse = await fetch(
          `${API_BASE_URL}/api/subscriptions`,
          { credentials: 'include' },
        );
        if (!subscriptionResponse.ok) {
          throw new Error('Unable to load subscriptions.');
        }

        const data = (await subscriptionResponse.json()) as Subscription[];
        if (!cancelled) setSubscriptions(data);
      } catch (loadError: unknown) {
        if (!cancelled) {
          setError(errorMessage(loadError, 'Unable to restore your session.'));
        }
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

  const handleAuthenticated = async (user: AuthUser): Promise<void> => {
    await importLocalSubscriptions();
    setCurrentUser(user);
    setError('');
    setSuccess('');
    await fetchSubscriptions();
    void navigate('/overview', { replace: true });
  };

  const handleLogout = async (): Promise<void> => {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    setCurrentUser(null);
    setSubscriptions(readLocalSubscriptions());
    resetForm();
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void => {
    const target = event.currentTarget;
    let value: string | boolean | BillingCycle;

    if (target.name === 'billingCycle') {
      value = Number(target.value) as BillingCycle;
    } else if (
      target instanceof HTMLInputElement &&
      target.type === 'checkbox'
    ) {
      value = target.checked;
    } else {
      value = target.value;
    }

    setForm(
      (previous) =>
        ({
          ...previous,
          [target.name]: value,
        }) as SubscriptionFormState,
    );
  };

  const resetForm = (): void => {
    setForm(emptyForm);
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    const payload: SubscriptionRequest = {
      name: form.name,
      category: form.category,
      price: Number(form.price),
      currency: form.currency,
      billingCycle: form.billingCycle,
      nextBillingDate: form.nextBillingDate,
      endDate: form.endDate || null,
      isActive: form.isActive,
    };

    const path = isEditing
      ? `/api/subscriptions/${form.id}`
      : '/api/subscriptions';

    try {
      if (currentUser) {
        const response = await fetch(`${API_BASE_URL}${path}`, {
          method: isEditing ? 'PUT' : 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: form.id }),
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'The operation failed.');
        }
        await fetchSubscriptions();
      } else {
        const now = new Date().toISOString();
        const savedSubscription: Subscription = {
          ...payload,
          id: isEditing ? form.id : crypto.randomUUID(),
          userId: null,
          createdAt: now,
          updatedAt: now,
        };
        const updatedSubscriptions = isEditing
          ? subscriptions.map((item) =>
              item.id === savedSubscription.id ? savedSubscription : item,
            )
          : [...subscriptions, savedSubscription];
        writeLocalSubscriptions(updatedSubscriptions);
        setSubscriptions(updatedSubscriptions);
      }

      resetForm();
      setSuccess(
        isEditing
          ? 'Subscription updated successfully.'
          : 'Subscription added successfully.',
      );
    } catch (submitError: unknown) {
      setError(errorMessage(submitError, 'The operation failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (subscription: Subscription): void => {
    setForm({
      id: subscription.id,
      name: subscription.name,
      category: subscription.category,
      price: String(subscription.price),
      currency: subscription.currency,
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate,
      endDate: subscription.endDate ?? '',
      isActive: subscription.isActive,
    });
    setIsEditing(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      if (currentUser) {
        const response = await fetch(
          `${API_BASE_URL}/api/subscriptions/${id}`,
          {
            method: 'DELETE',
            credentials: 'include',
          },
        );

        if (!response.ok) {
          throw new Error('Unable to delete subscription');
        }
        await fetchSubscriptions();
      } else {
        const updatedSubscriptions = subscriptions.filter(
          (item) => item.id !== id,
        );
        writeLocalSubscriptions(updatedSubscriptions);
        setSubscriptions(updatedSubscriptions);
      }

      if (form.id === id) {
        resetForm();
      }
      setSuccess('Subscription removed.');
    } catch (deleteError: unknown) {
      setError(errorMessage(deleteError, 'Unable to delete subscription'));
    }
  };

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <TopBar currentUser={currentUser} onLogout={handleLogout} />
      </aside>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route
            path="/overview"
            element={
              <>
                <SummaryCards summary={summary} />

                <div className="content-grid">
                  <SubscriptionForm
                    form={form}
                    isEditing={isEditing}
                    isSubmitting={isSubmitting}
                    error={error}
                    success={success}
                    onChange={handleChange}
                    onSubmit={handleSubmit}
                    onCancel={resetForm}
                  />

                  <SubscriptionList
                    subscriptions={subscriptions}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              </>
            }
          />
          <Route
            path="/chart"
            element={
              <SpendingChart
                chartData={chartData}
                selectedMonthIndex={selectedMonthIndex}
                onSelectMonth={setSelectedMonthIndex}
              />
            }
          />
          <Route
            path="/new-subscription"
            element={
              <div className="new-subscription-page">
                <SubscriptionForm
                  form={form}
                  isEditing={isEditing}
                  isSubmitting={isSubmitting}
                  error={error}
                  success={success}
                  onChange={handleChange}
                  onSubmit={handleSubmit}
                  onCancel={resetForm}
                />
              </div>
            }
          />
          <Route
            path="/sign-in"
            element={
              <AuthPage
                onAuthenticated={handleAuthenticated}
                onContinueWithoutAccount={() =>
                  navigate('/overview', { replace: true })
                }
              />
            }
          />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
