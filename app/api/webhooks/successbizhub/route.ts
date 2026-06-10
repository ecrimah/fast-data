import { NextResponse } from 'next/server';
import { mapSuccessBizStatus } from '@/lib/suppliers/successbizhub';
import { markOrderFulfilledByReference } from '@/lib/suppliers/dispatch-order';

export async function POST(request: Request) {
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
