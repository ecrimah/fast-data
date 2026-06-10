import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { computeAdminMetrics } from '@/lib/admin-metrics';
import type { Order } from '@/types';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ metrics: null, byNetwork: {}, byMethod: {} });

  const service = createServiceClient();
  const { data: orders } = await service.from('orders').select('*').order('created_at', { ascending: false }).limit(500);

  const list = (orders ?? []) as Order[];
  const metrics = computeAdminMetrics(list);

  const byMethod: Record<string, number> = {};
  for (const o of list.filter((x) => x.payment_status === 'paid')) {
    byMethod[o.payment_method] = (byMethod[o.payment_method] ?? 0) + 1;
  }

  const { data: rewards } = await service.from('referral_rewards').select('*').order('created_at', { ascending: false }).limit(50);

  return NextResponse.json({
    metrics,
    byNetwork: metrics.byNetwork,
    byMethod,
    referralRewards: rewards ?? [],
  });
}
