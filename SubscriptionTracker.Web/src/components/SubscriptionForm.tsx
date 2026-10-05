import type { ChangeEvent, FormEvent } from 'react';

import type { SubscriptionForm as SubscriptionFormState } from '../types';
import './SubscriptionForm.css';

interface SubscriptionFormProps {
  form: SubscriptionFormState;
  isEditing: boolean;
  isSubmitting: boolean;
  error: string;
  success: string;
  onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export default function SubscriptionForm({
  form,
  isEditing,
  isSubmitting,
  error,
  success,
  onChange,
  onSubmit,
  onCancel,
}: SubscriptionFormProps) {
  return (
    <section className="panel form-panel">
      <h2>{isEditing ? 'Edit subscription' : 'Add a subscription'}</h2>

      <form onSubmit={onSubmit} className="subscription-form">
        <label>
          Name
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            placeholder="Netflix"
            required
          />
        </label>

        <div className="two-column">
          <label>
            Category
            <input name="category" value={form.category} onChange={onChange} />
          </label>

          <label>
            Currency
            <select name="currency" value={form.currency} onChange={onChange}>
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
              onChange={onChange}
              required
            />
          </label>

          <label>
            Billing cycle
            <select
              name="billingCycle"
              value={form.billingCycle}
              onChange={onChange}
            >
              <option value={0}>Weekly</option>
              <option value={1}>Monthly</option>
              <option value={2}>Quarterly</option>
              <option value={3}>Yearly</option>
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
              onChange={onChange}
            />
          </label>

          <label>
            End date (optional)
            <input
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={onChange}
            />
          </label>

          <label className="checkbox-inline">
            <input
              name="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={onChange}
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
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
