import { NextResponse } from 'next/server';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { completePaidOrder } from '@/services/payment/complete-order';

export async function POST(req: Request) {
  try {
    let body: Record<string, unknown> = {};
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await req.json();
    } else {
      const rawText = await req.text();
      try {
        body = JSON.parse(rawText);
      } catch {
        body = Object.fromEntries(new URLSearchParams(rawText).entries());
      }
    }

    const data = (body.data || {}) as Record<string, unknown>;

    // Secret check: Moolre only includes a secret if you configured one in their
    // dashboard. Reject ONLY when a secret IS sent but doesn't match (tamper guard).
    // A missing secret must NOT block a legitimate callback — otherwise every
    // payment silently fails with 403.
    const expectedSecret = process.env.MOOLRE_CALLBACK_SECRET;
    const providedSecret = (body.secret ?? data.secret) as string | undefined;
    const secretProvided = providedSecret !== undefined && providedSecret !== null && String(providedSecret).length > 0;
    if (expectedSecret && secretProvided && providedSecret !== expectedSecret) {
      return NextResponse.json({ success: false, message: 'Invalid callback signature' }, { status: 403 });
    }

    // Best-effort visibility: record that a callback arrived (never blocks the flow).
    if (hasSupabaseAdminConfig()) {
      try {
        await createServiceClient()
          .from('payment_events')
          .insert({
            raw_body: body,
            provider: 'moolre',
            transaction_id: String(data.transactionid || data.transaction_id || ''),
            amount: data.amount ? parseFloat(String(data.amount)) : null,
            reference_hint:
              String(data.externalref || body.externalref || '').replace(/-R\d+$/, '') || 'callback',
            parse_status: 'received',
          });
      } catch (logErr) {
        console.error('[Moolre callback] inbound log failed', logErr);
      }
    }

    const rawExternalRef = String(
      data.externalref || data.external_reference || body.externalref || ''
    );
    const paymentRef = rawExternalRef.replace(/-R\d+$/, '');
    const metadata = (data.metadata || body.metadata || {}) as Record<string, unknown>;
    const orderId = metadata.order_id as string | undefined;

    const apiOk = body.status === 1 || body.status === '1';
    const txstatus = data.txstatus ?? data.txtstatus;
    const txOk = txstatus === 1 || txstatus === '1';
    const messageStr = String(body.message || '').toLowerCase();
    const isSuccess = (apiOk || txOk) && !messageStr.includes('fail') && !messageStr.includes('error');

    if (!isSuccess || !hasSupabaseAdminConfig()) {
      return NextResponse.json({ success: false, message: 'Payment not successful' });
    }

    const supabase = createServiceClient();
    const callbackAmount = data.amount ? parseFloat(String(data.amount)) : null;

    let query = supabase.from('orders').select('id, payment_ref, amount, payment_status').limit(1);

    if (orderId) {
      query = query.eq('id', orderId);
    } else if (metadata.original_payment_ref) {
      query = query.eq('payment_ref', String(metadata.original_payment_ref));
    } else if (paymentRef) {
      query = query.eq('payment_ref', paymentRef);
    } else {
      return NextResponse.json({ success: false, message: 'Missing order reference' }, { status: 400 });
    }

    const { data: order } = await query.maybeSingle();
    if (!order) {
      await supabase.from('payment_events').insert({
        raw_body: body,
        provider: 'moolre',
        transaction_id: String(data.transactionid || data.transaction_id || ''),
        amount: callbackAmount,
        reference_hint: paymentRef || rawExternalRef,
        parse_status: 'unparsed',
      });
      return NextResponse.json({ success: false, message: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'paid') {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    if (callbackAmount !== null && Math.abs(callbackAmount - Number(order.amount)) > 0.01) {
      await supabase.from('payment_events').insert({
        raw_body: body,
        provider: 'moolre',
        transaction_id: String(data.transactionid || data.transaction_id || ''),
        amount: callbackAmount,
        reference_hint: `${paymentRef || rawExternalRef} (amount mismatch)`,
        parse_status: 'unparsed',
      });
      return NextResponse.json({ success: false, message: 'Amount mismatch' }, { status: 400 });
    }

    await completePaidOrder(order.id);

    return NextResponse.json({ success: true, message: 'Payment verified' });
  } catch (error) {
    console.error('[Moolre callback]', error);
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Moolre callback ready' });
}
