import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { DeliveryStatus } from '@/types';
import { smsOrderFulfilled } from '@/lib/notifications/moolre-sms';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { id } = await params;
  const service = createServiceClient();
  const { data: order } = await service
    .from('orders')
    .select('phone, bundle_size, payment_ref')
    .eq('id', id)
    .maybeSingle();

  await service
    .from('orders')
    .update({
      delivery_status: DeliveryStatus.DELIVERED,
      supplier_status: 'fulfilled',
      supplier_fulfilled_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (order) {
    smsOrderFulfilled({
      phone: order.phone,
      bundle: order.bundle_size,
      ref: order.payment_ref,
      triggeredBy: auth.userId,
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
