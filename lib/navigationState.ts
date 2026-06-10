import { Bundle, Network, Order } from '@/types';

const CHECKOUT_KEY = 'fds_checkout';
const PAYMENT_PENDING_KEY = 'fds_payment_pending';
const SUCCESS_ORDER_KEY = 'fds_success_order';

export function setCheckoutState(state: { bundle: Bundle; network: Network }) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CHECKOUT_KEY, JSON.stringify(state));
}

export function getCheckoutState(): { bundle: Bundle; network: Network } | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(CHECKOUT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { bundle: Bundle; network: Network };
  } catch {
    return null;
  }
}

export function clearCheckoutState() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CHECKOUT_KEY);
}

export function setPaymentPendingState(state: { order: Order; transactionRef: string }) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PAYMENT_PENDING_KEY, JSON.stringify(state));
}

export function getPaymentPendingState(): { order: Order; transactionRef: string } | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PAYMENT_PENDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { order: Order; transactionRef: string };
  } catch {
    return null;
  }
}

export function setSuccessOrderState(order: Partial<Order> | Order | Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SUCCESS_ORDER_KEY, JSON.stringify(order));
}

export function getSuccessOrderState(): Partial<Order> | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(SUCCESS_ORDER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
