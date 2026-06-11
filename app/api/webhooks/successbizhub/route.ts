import { NextResponse } from 'next/server';
import { mapSuccessBizStatus } from '@/lib/suppliers/successbizhub';
import { markOrderFulfilledByReference } from '@/lib/suppliers/dispatch-order';

export async function POST(request: Request) {
  const webhookSecret = process.env.SUCCESSBIZHUB_WEBHOOK_SECRET?.trim();
  if (webhookSecret) {
    const provided =
      request.headers.get('x-webhook-secret') ||
      request.headers.get('x-api-key') ||
      new URL(request.url).searchParams.get('secret');
    if (provided !== webhookSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const statusRaw = String(body.status ?? body.order_status ?? '');
  const mapped = mapSuccessBizStatus(statusRaw);
  const reference = String(body.reference ?? body.order_reference ?? body.external_reference ?? '');

  if (mapped === 'fulfilled') {
    await markOrderFulfilledByReference({ supplierReference: reference });
  }

  return NextResponse.json({ received: true, mapped });
}
