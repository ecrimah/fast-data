import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { DeliveryStatus } from '@/types';
import { smsOrderFulfilled } from '@/lib/notifications/moolre-sms';

export async function PATCH(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { orderIds, deliveryStatus } = await request.json();
  if (!Array.isArray(orderIds) || !deliveryStatus) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const service = createServiceClient();
  await service.from('orders').update({ delivery_status: deliveryStatus }).in('id', orderIds);

  if (deliveryStatus === DeliveryStatus.DELIVERED) {
    const { data: orders } = await service
      .from('orders')
      .select('phone, bundle_size, payment_ref')
      .in('id', orderIds);
    for (const o of orders ?? []) {
      smsOrderFulfilled({
        phone: o.phone,
        bundle: o.bundle_size,
        ref: o.payment_ref,
        triggeredBy: auth.userId,
      }).catch(console.error);
    }
  }

  return NextResponse.json({ ok: true, count: orderIds.length });
}
