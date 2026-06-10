import { NextResponse } from 'next/server';
import { completePaidOrder } from '@/services/payment/complete-order';
import { dispatchOrderToSupplier } from '@/lib/suppliers/dispatch-order';
import { PaymentStatus } from '@/types';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { orderId, action } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    if (action === 'complete') {
      await completePaidOrder(orderId);
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceClient();
    const { data: order } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .maybeSingle();

    if (order?.payment_status === PaymentStatus.PAID) {
      await dispatchOrderToSupplier(orderId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[orders/dispatch]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
