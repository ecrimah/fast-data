import { NextResponse } from 'next/server';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
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
      .select('id, payment_ref, amount, payment_status')
      .eq('payment_ref', paymentRef)
      .maybeSingle();

    if (!order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true, payment_status: 'paid' });
    }

    if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY) {
      return NextResponse.json({ success: false, message: 'Moolre not configured' }, { status: 503 });
    }

    const checkResponse = await fetch('https://api.moolre.com/embed/status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY,
      },
      body: JSON.stringify({ externalref: paymentRef }),
    });

    const checkResult = await checkResponse.json();
    const statusStr = String(checkResult.data?.status || '').toLowerCase();
    const verified =
      checkResult.status === 1 &&
      checkResult.data &&
      ['success', 'successful', 'completed', 'paid'].includes(statusStr);

    if (!verified) {
      return NextResponse.json({ success: false, payment_status: order.payment_status });
    }

    await completePaidOrder(order.id);

    return NextResponse.json({ success: true, payment_status: 'paid' });
  } catch (error) {
    console.error('[Moolre verify]', error);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}
