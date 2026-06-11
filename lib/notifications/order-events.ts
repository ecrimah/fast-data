import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { smsNewOrderAdmin } from '@/lib/notifications/moolre-sms';
import { emailNewOrderAdmin, emailOrderReceiptCustomer } from '@/lib/notifications/email';
import { getGuestUserId } from '@/lib/auth/guest-user';

/**
 * Fan-out notifications for a newly paid order:
 *  - SMS to admin (new order alert)
 *  - Email to admin (new order alert)
 *  - Email receipt to the customer (only if we can resolve a real email)
 *
 * Best-effort: never throws, so it can't break the payment/dispatch flow.
 * The customer's "payment received" and "delivered" SMS are handled elsewhere.
 */
export async function notifyNewPaidOrder(orderId: string): Promise<void> {
  try {
    if (!hasSupabaseAdminConfig()) return;
    const service = createServiceClient();

    const { data: order } = await service
      .from('orders')
      .select('id, user_id, network, bundle_size, amount, phone, payment_ref, payment_method')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return;

    let customerEmail: string | null = null;
    let customerName: string | undefined;
    const guestId = await getGuestUserId();

    if (order.user_id && order.user_id !== guestId) {
      const { data: profile } = await service
        .from('profiles')
        .select('email, name')
        .eq('id', order.user_id)
        .maybeSingle();
      customerEmail = profile?.email ?? null;
      customerName = profile?.name ?? undefined;
    }

    const data = {
      name: customerName,
      network: String(order.network),
      bundle: String(order.bundle_size),
      phone: String(order.phone),
      amount: Number(order.amount),
      ref: String(order.payment_ref),
      paymentMethod: String(order.payment_method ?? 'momo'),
    };

    await Promise.allSettled([
      smsNewOrderAdmin(data),
      emailNewOrderAdmin(data),
      customerEmail ? emailOrderReceiptCustomer(customerEmail, data) : Promise.resolve(),
    ]);
  } catch (e) {
    console.error('[notifyNewPaidOrder]', e);
  }
}
