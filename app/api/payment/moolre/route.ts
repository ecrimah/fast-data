import { NextResponse } from 'next/server';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { moolreCallbackUrl, moolreSuccessRedirectUrl, resolvePublicAppUrl } from '@/lib/moolre-app-url';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, customerEmail } = body;

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing orderId' }, { status: 400 });
    }

    if (!process.env.MOOLRE_API_USER || !process.env.MOOLRE_API_PUBKEY || !process.env.MOOLRE_ACCOUNT_NUMBER) {
      return NextResponse.json({ success: false, message: 'Moolre not configured' }, { status: 500 });
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 500 });
    }

    const supabase = createServiceClient();
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, payment_ref, amount, payment_status, payment_method')
      .or(`id.eq.${orderId},payment_ref.eq.${orderId}`)
      .single();

    if (error || !order) {
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: false, message: 'Order already paid' }, { status: 400 });
    }

    const amount = Number(order.amount);
    const orderRef = order.payment_ref;
    const requestUrl = new URL(req.url);
    const baseUrl = resolvePublicAppUrl(requestUrl.origin);
    const uniqueRef = `${orderRef}-R${Date.now()}`;

    await supabase.from('orders').update({ moolre_external_ref: uniqueRef }).eq('id', order.id);

    const payload = {
      type: 1,
      amount: amount.toString(),
      email: process.env.MOOLRE_MERCHANT_EMAIL || customerEmail || 'payments@fastdataservices.com',
      externalref: uniqueRef,
      callback: moolreCallbackUrl(baseUrl),
      redirect: moolreSuccessRedirectUrl(orderRef, baseUrl),
      reusable: '0',
      currency: 'GHS',
      accountnumber: process.env.MOOLRE_ACCOUNT_NUMBER,
      metadata: {
        original_payment_ref: orderRef,
        order_id: order.id,
      },
    };

    const response = await fetch('https://api.moolre.com/embed/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-PUBKEY': process.env.MOOLRE_API_PUBKEY,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.status === 1 && result.data?.authorization_url) {
      return NextResponse.json({ success: true, url: result.data.authorization_url, reference: result.data.reference });
    }

    return NextResponse.json({ success: false, message: result.message || 'Failed to generate payment link' }, { status: 400 });
  } catch (error) {
    console.error('[Moolre init]', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
