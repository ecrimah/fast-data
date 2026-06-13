import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { checkMoolrePaymentStatus, discoverPaidExternalRef } from '@/lib/moolre-status';
import { completePaidOrder } from '@/services/payment/complete-order';

export type ReconcileResult = {
  checked: number;
  completed: number;
  stillPending: number;
  noRef: number;
  errors: string[];
  completedRefs: string[];
};

/** Poll Moolre for recent pending MoMo orders and complete any that were paid. */
export async function reconcilePendingPayments(limit = 50): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    checked: 0,
    completed: 0,
    stillPending: 0,
    noRef: 0,
    errors: [],
    completedRefs: [],
  };

  if (!hasSupabaseAdminConfig()) {
    result.errors.push('Database not configured');
    return result;
  }

  const service = createServiceClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const discoverSince = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  let discoverAttempts = 0;
  const maxDiscover = 3;

  const { data: orders, error } = await service
    .from('orders')
    .select('id, payment_ref, moolre_external_ref, amount, payment_status, created_at')
    .eq('payment_status', 'pending')
    .eq('payment_method', 'moolre')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    result.errors.push(error.message);
    return result;
  }

  for (const order of orders ?? []) {
    result.checked += 1;
    let externalRef = order.moolre_external_ref as string | null;

    if (!externalRef) {
      const recent = order.created_at >= discoverSince;
      if (recent && discoverAttempts < maxDiscover) {
        discoverAttempts += 1;
        externalRef = await discoverPaidExternalRef(order.payment_ref);
        if (externalRef) {
          await service.from('orders').update({ moolre_external_ref: externalRef }).eq('id', order.id);
        }
      }
      if (!externalRef) {
        result.noRef += 1;
        continue;
      }
    }

    const status = await checkMoolrePaymentStatus(externalRef);
    if (status.error) {
      result.errors.push(`${order.payment_ref}: ${status.error}`);
      continue;
    }

    if (status.paid) {
      try {
        await completePaidOrder(order.id);
        result.completed += 1;
        result.completedRefs.push(order.payment_ref);
      } catch (e) {
        result.errors.push(`${order.payment_ref}: ${e instanceof Error ? e.message : 'complete failed'}`);
      }
    } else {
      result.stillPending += 1;
    }
  }

  return result;
}
