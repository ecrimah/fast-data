import { NextResponse } from 'next/server';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { checkMoolrePaymentStatus, discoverPaidExternalRef } from '@/lib/moolre-status';
import { completePaidOrder } from '@/services/payment/complete-order';

export async function POST(req: Request) {
  try {
    const { paymentRef } = await req.json();

    if (!paymentRef || typeof paymentRef !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing paymentRef' }, { status: 400 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 503 });
    }

    const supabase = createServiceClient();
    const { data: order } = await supabase
      .from('orders')
      .select('id, payment_ref, amount, payment_status, moolre_external_ref')
      .eq('payment_ref', paymentRef)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true, payment_status: 'paid' });
    }

    let externalRef = order.moolre_external_ref as string | null;
    if (!externalRef) {
      externalRef = await discoverPaidExternalRef(paymentRef);
      if (externalRef) {
        await supabase.from('orders').update({ moolre_external_ref: externalRef }).eq('id', order.id);
      }
    }

    if (!externalRef) {
      return NextResponse.json({
        success: false,
        payment_status: order.payment_status,
        message: 'Payment not found on Moolre yet',
      });
    }

    const status = await checkMoolrePaymentStatus(externalRef);
    if (status.error) {
      return NextResponse.json({ success: false, message: status.error }, { status: 503 });
    }

    if (!status.paid) {
      return NextResponse.json({
        success: false,
        payment_status: order.payment_status,
        message: status.notFound ? 'Payment not found on Moolre yet' : 'Payment still pending on Moolre',
      });
    }

    await completePaidOrder(order.id);

    return NextResponse.json({ success: true, payment_status: 'paid' });
  } catch (error) {
    console.error('[Moolre verify]', error);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
