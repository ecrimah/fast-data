import { Order, DeliveryStatus, PaymentStatus } from '@/types';

export type AdminMetrics = {
  gmv30d: number;
  revenue30d: number;
  ordersToday: number;
  ordersTotal: number;
  pendingDelivery: number;
  pendingPayment: number;
  delivered: number;
  failed: number;
  fulfillmentRate: number;
  paymentSuccessRate: number;
  moolreShare: number;
  walletShare: number;
  byNetwork: Record<string, number>;
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export function computeAdminMetrics(orders: Order[]): AdminMetrics {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = daysAgo(30);

  const paid = orders.filter((o) => o.payment_status === PaymentStatus.PAID);
  const recentPaid = paid.filter((o) => new Date(o.created_at) >= thirtyDaysAgo);
  const todayOrders = orders.filter((o) => new Date(o.created_at) >= todayStart);

  const gmv30d = recentPaid.reduce((s, o) => s + o.amount, 0);
  const pendingDelivery = paid.filter((o) => o.delivery_status !== DeliveryStatus.DELIVERED).length;
  const delivered = paid.filter((o) => o.delivery_status === DeliveryStatus.DELIVERED).length;
  const pendingPayment = orders.filter((o) => o.payment_status === PaymentStatus.PENDING).length;
  const failed = orders.filter((o) => o.payment_status === PaymentStatus.FAILED).length;

  const settled = orders.filter((o) => o.payment_status !== PaymentStatus.PENDING);
  const paymentSuccessRate = settled.length ? (paid.length / settled.length) * 100 : 100;
  const fulfillmentRate = paid.length ? (delivered / paid.length) * 100 : 0;

  const moolreCount = paid.filter((o) => o.payment_method === 'moolre').length;
  const walletCount = paid.filter((o) => o.payment_method === 'wallet').length;
  const payTotal = moolreCount + walletCount;

  const byNetwork: Record<string, number> = {};
  for (const o of recentPaid) {
    byNetwork[o.network] = (byNetwork[o.network] || 0) + 1;
  }

  return {
    gmv30d,
    revenue30d: gmv30d,
    ordersToday: todayOrders.length,
    ordersTotal: orders.length,
    pendingDelivery,
    pendingPayment,
    delivered,
    failed,
    fulfillmentRate,
    paymentSuccessRate: Number.isFinite(paymentSuccessRate) ? paymentSuccessRate : 100,
    moolreShare: payTotal ? (moolreCount / payTotal) * 100 : 100,
    walletShare: payTotal ? (walletCount / payTotal) * 100 : 0,
    byNetwork,
  };
}

export function formatGHS(amount: number): string {
  return `GH₵ ${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
