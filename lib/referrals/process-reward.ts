import 'server-only';

import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { getPlatformConfig } from '@/lib/data/platform-config';
import { PaymentStatus } from '@/types';

/** Credit referrer when a referred user completes their first paid order. */
export async function processReferralReward(orderId: string): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;

  const service = createServiceClient();
  const config = await getPlatformConfig();

  const { data: order } = await service
    .from('orders')
    .select('id, user_id, amount, payment_status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.payment_status !== PaymentStatus.PAID) return;

  const { data: buyer } = await service
    .from('profiles')
    .select('id, referred_by')
    .eq('id', order.user_id)
    .maybeSingle();

  if (!buyer?.referred_by) return;

  const { count: priorPaid } = await service
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', order.user_id)
    .eq('payment_status', PaymentStatus.PAID)
    .neq('id', order.id);

  if ((priorPaid ?? 0) > 0) return;

  const { data: existing } = await service
    .from('referral_rewards')
    .select('id')
    .eq('referred_id', order.user_id)
    .maybeSingle();

  if (existing) return;

  const reward = config.referralRewardGhs;
  if (reward <= 0) return;

  const { data: referrer } = await service
    .from('profiles')
    .select('id, wallet_balance')
    .eq('id', buyer.referred_by)
    .maybeSingle();

  if (!referrer) return;

  const newBalance = Number(referrer.wallet_balance ?? 0) + reward;

  await service.from('profiles').update({ wallet_balance: newBalance }).eq('id', referrer.id);

  await service.from('transactions').insert({
    user_id: referrer.id,
    type: 'reward',
    amount: reward,
    status: 'completed',
    reference: `REF-${Date.now()}`,
  });

  await service.from('referral_rewards').insert({
    referrer_id: referrer.id,
    referred_id: order.user_id,
    order_id: order.id,
    amount: reward,
    status: 'credited',
    credited_at: new Date().toISOString(),
  });
}
