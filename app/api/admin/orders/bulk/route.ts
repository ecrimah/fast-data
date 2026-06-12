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

/** Delete multiple unpaid/failed orders (abandoned checkouts). */
export async function DELETE(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { orderIds } = await request.json();
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return NextResponse.json({ error: 'orderIds required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: orders, error: fetchErr } = await service
    .from('orders')
    .select('id, payment_status')
    .in('id', orderIds);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

  const deletable = (orders ?? []).filter((o) => o.payment_status === 'pending' || o.payment_status === 'failed');
  if (!deletable.length) {
    return NextResponse.json({ error: 'No deletable orders in selection (paid orders cannot be removed)' }, { status: 400 });
  }

  const ids = deletable.map((o) => o.id);
  const { error } = await service.from('orders').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: ids.length, skipped: orderIds.length - ids.length });
}
