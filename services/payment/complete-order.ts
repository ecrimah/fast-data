import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { PaymentStatus } from '@/types';
import { dispatchOrderToSupplier } from '@/lib/suppliers/dispatch-order';
import { smsPaymentReceived } from '@/lib/notifications/moolre-sms';
import { processReferralReward } from '@/lib/referrals/process-reward';

export async function completePaidOrder(orderId: string): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;

  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from('orders')
    .select('id, payment_status, user_id, amount, phone, payment_ref, bundle_size')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.payment_status === PaymentStatus.PAID) {
    if (order?.payment_status === PaymentStatus.PAID) {
      await dispatchOrderToSupplier(orderId);
    }
    return;
  }

  await supabase.from('orders').update({ payment_status: PaymentStatus.PAID }).eq('id', orderId);

  await supabase.from('transactions').insert({
    user_id: order.user_id,
    type: 'purchase',
    amount: -Number(order.amount),
    status: 'completed',
    reference: `TXN-${Date.now()}`,
  });

  smsPaymentReceived({
    phone: order.phone,
    amount: Number(order.amount),
    ref: order.payment_ref,
  }).catch(console.error);

  await processReferralReward(orderId);

  await dispatchOrderToSupplier(orderId);
}
