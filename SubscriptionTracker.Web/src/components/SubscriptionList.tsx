import type { Subscription } from '../types';
import './SubscriptionList.css';

interface SubscriptionListProps {
  subscriptions: Subscription[];
  isLoading: boolean;
  onEdit: (subscription: Subscription) => void;
  onDelete: (id: string) => void;
}

export default function SubscriptionList({
  subscriptions,
  isLoading,
  onEdit,
  onDelete,
}: SubscriptionListProps) {
  return (
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
                  {subscription.currency} {subscription.price.toFixed(2)}
                </strong>
                <span>
                  {
                    ['Weekly', 'Monthly', 'Quarterly', 'Yearly'][
                      subscription.billingCycle
                    ]
                  }
                </span>
              </div>

              <div className="subscription-footer">
                <small>
                  {subscription.endDate
                    ? `Ends: ${subscription.endDate}`
                    : 'Ongoing'}
                  {' · Next billing: '}
                  {subscription.nextBillingDate}
                </small>
                <div className="card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => onEdit(subscription)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    onClick={() => onDelete(subscription.id)}
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
  );
}
