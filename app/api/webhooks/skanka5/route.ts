import { NextResponse } from 'next/server';
import { logWebhookEvent, verifyWebhookSignature } from '@/lib/suppliers/skanka5';
import { markOrderFulfilledByReference } from '@/lib/suppliers/dispatch-order';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-skanka5-signature');
  const allowUnsigned = process.env.SKANKA5_ALLOW_UNSIGNED_WEBHOOKS === '1';
  const signatureValid = verifyWebhookSignature(rawBody, signature);

  if (!signatureValid && !allowUnsigned) {
    await logWebhookEvent({ ok: false, error: 'Invalid signature', payload: { body_snippet: rawBody.slice(0, 300) } });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: {
    event?: string;
    reference?: string;
    status?: string;
    items?: Array<{ order_code?: string; msisdn?: string; status?: string }>;
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (event.event !== 'order.items_processed') {
    return NextResponse.json({ received: true, ignored: true });
  }

  const orderCodes = (event.items ?? [])
    .map((i) => i.order_code)
    .filter((c): c is string => typeof c === 'string' && c.length > 0);

  let fulfilled = 0;
  for (const code of orderCodes) {
    const ok = await markOrderFulfilledByReference({ orderCode: code });
    if (ok) fulfilled += 1;
  }

  if (fulfilled === 0 && event.reference) {
    const ok = await markOrderFulfilledByReference({ supplierReference: event.reference });
    if (ok) fulfilled = 1;
  }

  await logWebhookEvent({
    ok: true,
    supplierReference: event.reference,
    payload: { event, fulfilled },
  });

  return NextResponse.json({ received: true, fulfilled });
}
