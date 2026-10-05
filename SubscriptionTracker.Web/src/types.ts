export type BillingCycle = 0 | 1 | 2 | 3;

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface Subscription {
  id: string;
  userId: string | null;
  name: string;
  category: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionForm {
  id: string;
  name: string;
  category: string;
  price: string;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  endDate: string;
  isActive: boolean;
}

export interface SubscriptionRequest {
  name: string;
  category: string;
  price: number;
  currency: string;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  endDate: string | null;
  isActive: boolean;
}
