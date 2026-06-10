import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { DeliveryStatus } from '@/types';
import { smsOrderFulfilled } from '@/lib/notifications/moolre-sms';

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { orderId, outcome, note } = await request.json();
  if (!orderId || !['fulfilled', 'failed'].includes(outcome)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: order } = await service
    .from('orders')
    .select('id, payment_ref, phone, bundle_size, supplier_status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.supplier_status !== 'awaiting_manual') {
    return NextResponse.json({ error: 'Not awaiting manual fulfilment' }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (outcome === 'fulfilled') {
    await service
      .from('orders')
      .update({
        delivery_status: DeliveryStatus.DELIVERED,
        supplier_status: 'manual_fulfilled',
        supplier_error: note ?? null,
        supplier_fulfilled_at: now,
      })
      .eq('id', orderId);

    await service.from('supplier_logs').insert({
      supplier: 'manual',
      event_type: 'manual_resolved',
      scope: 'customer_order',
      reference: order.payment_ref,
      ok: true,
      request_payload: { outcome, note, resolved_by: auth.userId },
    });

    smsOrderFulfilled({
      phone: order.phone,
      bundle: order.bundle_size,
      ref: order.payment_ref,
      triggeredBy: auth.userId,
    }).catch(console.error);

    return NextResponse.json({ ok: true, outcome: 'fulfilled' });
  }

  await service
    .from('orders')
    .update({
      supplier_status: 'manual_failed',
      supplier_error: note ?? 'Marked failed by admin',
    })
    .eq('id', orderId);

  await service.from('supplier_logs').insert({
    supplier: 'manual',
    event_type: 'manual_resolved',
    scope: 'customer_order',
    reference: order.payment_ref,
    ok: false,
    error: note ?? 'Marked failed',
    request_payload: { outcome, note, resolved_by: auth.userId },
  });

  return NextResponse.json({ ok: true, outcome: 'failed' });
}
