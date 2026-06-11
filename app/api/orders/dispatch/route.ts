import { NextResponse } from 'next/server';
import { assertUserApi, userOwnsOrder } from '@/lib/auth/user-api';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { completePaidOrder } from '@/services/payment/complete-order';
import { dispatchOrderToSupplier } from '@/lib/suppliers/dispatch-order';
import { PaymentStatus } from '@/types';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { orderId, action } = await req.json();

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    const adminAuth = await assertAdminApi(req);
    const userAuth = adminAuth.ok ? null : await assertUserApi(req);
    if (!adminAuth.ok && !userAuth?.ok) {
      return NextResponse.json({ error: userAuth?.error ?? 'Unauthorized' }, { status: userAuth?.status ?? 401 });
    }

    if (!adminAuth.ok && userAuth?.ok) {
      const owns = await userOwnsOrder(userAuth.userId, orderId);
      if (!owns) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'complete') {
      if (!adminAuth.ok) return NextResponse.json({ error: 'Admin only' }, { status: 403 });
      await completePaidOrder(orderId);
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceClient();
    const { data: order } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.payment_status !== PaymentStatus.PAID) {
      return NextResponse.json({ error: 'Order not paid' }, { status: 409 });
    }

    await dispatchOrderToSupplier(orderId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[orders/dispatch]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
