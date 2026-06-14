import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { completePaidOrder } from '@/services/payment/complete-order';

/**
 * Manually approve a pending order: mark it paid, notify the customer, and
 * dispatch it to the supplier so the wholesale can start. Used when a payment
 * was confirmed out-of-band (e.g. direct MoMo) but the order is still pending.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { id } = await params;
  const service = createServiceClient();

  const { data: order } = await service
    .from('orders')
    .select('id, payment_status, payment_ref')
    .eq('id', id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

  if (order.payment_status === 'paid') {
    // Already paid — just (re)dispatch to the supplier.
    await completePaidOrder(order.id);
    return NextResponse.json({ ok: true, alreadyPaid: true, paymentRef: order.payment_ref });
  }

  // Marks paid, records the transaction, notifies, and dispatches to the supplier.
  await completePaidOrder(order.id);

  return NextResponse.json({ ok: true, paymentRef: order.payment_ref });
}
