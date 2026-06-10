import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { PaymentStatus, DeliveryStatus } from '@/types';

export async function fetchAdminNotifications() {
  const empty = {
    pendingDelivery: 0,
    awaitingManual: 0,
    failedSupplier: 0,
    unmatchedPayments: 0,
    openDisputes: 0,
    total: 0,
  };
  if (!hasSupabaseAdminConfig()) return empty;

  const service = createServiceClient();
  const [pending, manual, failed, unmatched, disputes] = await Promise.all([
    service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', PaymentStatus.PAID)
      .neq('delivery_status', DeliveryStatus.DELIVERED),
    service.from('orders').select('id', { count: 'exact', head: true }).eq('supplier_status', 'awaiting_manual'),
    service.from('orders').select('id', { count: 'exact', head: true }).eq('supplier_status', 'failed'),
    service.from('payment_events').select('id', { count: 'exact', head: true }).is('matched_order_id', null),
    service.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  const counts = {
    pendingDelivery: pending.count ?? 0,
    awaitingManual: manual.count ?? 0,
    failedSupplier: failed.count ?? 0,
    unmatchedPayments: unmatched.count ?? 0,
    openDisputes: disputes.count ?? 0,
  };

  return {
    ...counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}
