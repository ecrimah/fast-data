import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { dispatchOrderToSupplier } from '@/lib/suppliers/dispatch-order';

/**
 * Re-send a PAID order to the supplier — used when the first dispatch failed.
 * Clears the previous supplier attempt so the dispatch guard allows a retry.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { id } = await params;
  const service = createServiceClient();

  const { data: order } = await service
    .from('orders')
    .select('id, payment_status, delivery_status, payment_ref')
    .eq('id', id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Only paid orders can be sent to the supplier.' }, { status: 400 });
  }
  if (order.delivery_status === 'delivered') {
    return NextResponse.json({ error: 'Order already delivered.' }, { status: 400 });
  }

  // Reset the previous (failed) supplier attempt so dispatchOrderToSupplier runs again.
  await service
    .from('orders')
    .update({
      supplier_reference: null,
      supplier_order_code: null,
      supplier_status: null,
      supplier_error: null,
    })
    .eq('id', id);

  await dispatchOrderToSupplier(id);

  const { data: updated } = await service
    .from('orders')
    .select('supplier, supplier_status, supplier_error, supplier_reference')
    .eq('id', id)
    .maybeSingle();

  const ok = updated?.supplier_status !== 'failed';
  return NextResponse.json({
    ok,
    paymentRef: order.payment_ref,
    supplierStatus: updated?.supplier_status ?? null,
    supplierError: updated?.supplier_error ?? null,
  });
}
