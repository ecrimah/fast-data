import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { reconcilePendingPayments } from '@/lib/reconcile-pending-payments';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { checkMoolrePaymentStatus } from '@/lib/moolre-status';
import { completePaidOrder } from '@/services/payment/complete-order';

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));

  // Reconcile all recent pending orders that have a stored Moolre ref.
  if (body.action === 'bulk') {
    const result = await reconcilePendingPayments(100);
    return NextResponse.json(result);
  }

  // Verify + complete a single order by payment ref.
  const paymentRef = typeof body.paymentRef === 'string' ? body.paymentRef.trim() : '';
  if (!paymentRef || !hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: 'paymentRef required' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: order } = await service
    .from('orders')
    .select('id, payment_ref, payment_status, moolre_external_ref')
    .eq('payment_ref', paymentRef)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.payment_status === 'paid') {
    return NextResponse.json({ ok: true, alreadyPaid: true, paymentRef });
  }

  const externalRef = order.moolre_external_ref as string | null;
  if (!externalRef) {
    return NextResponse.json({
      ok: false,
      error: 'This order has no Moolre payment reference stored (created before the fix). Mark paid manually or ask the customer to retry checkout.',
    }, { status: 400 });
  }

  const status = await checkMoolrePaymentStatus(externalRef);
  if (!status.paid) {
    return NextResponse.json({
      ok: false,
      paid: false,
      message: status.notFound ? 'Moolre has no record of this payment yet' : 'Payment still pending on Moolre',
    });
  }

  await completePaidOrder(order.id);
  return NextResponse.json({ ok: true, paid: true, paymentRef, completed: true });
}
