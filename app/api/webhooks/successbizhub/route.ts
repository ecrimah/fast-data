import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { mapSuccessBizStatus } from '@/lib/suppliers/successbizhub';
import { markOrderFulfilledByReference } from '@/lib/suppliers/dispatch-order';

function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify the DataCoreGH / SuccessBizHub webhook.
 *
 * Supplier supports two modes (see their Webhook Settings):
 *  - HMAC ON  → sends `X-Webhook-Signature: <hex hmac-sha256(rawBody, secret)>`
 *  - HMAC OFF → legacy plain payload; we accept a shared secret header instead.
 *
 * When SUCCESSBIZHUB_WEBHOOK_SECRET is unset, verification is skipped (dev only).
 */
function verifySignature(rawBody: string, request: Request): boolean {
  const secret = process.env.SUCCESSBIZHUB_WEBHOOK_SECRET?.trim();
  if (!secret) return true;

  // 1) HMAC signature (preferred — matches "Enable HMAC webhook signatures").
  const signatureHeader =
    request.headers.get('x-webhook-signature') ||
    request.headers.get('x-signature') ||
    request.headers.get('x-hub-signature-256');

  if (signatureHeader) {
    const provided = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase();
    const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return timingSafeEqual(provided, expected);
  }

  // 2) Legacy shared-secret header / query (when HMAC is off).
  const plain =
    request.headers.get('x-webhook-secret') ||
    request.headers.get('x-api-key') ||
    new URL(request.url).searchParams.get('secret');
  return plain != null && timingSafeEqual(plain, secret);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const statusRaw = String(body.status ?? body.order_status ?? '');
  const mapped = mapSuccessBizStatus(statusRaw);
  const reference = String(body.reference ?? body.order_reference ?? body.external_reference ?? '');

  if (mapped === 'fulfilled' && reference) {
    await markOrderFulfilledByReference({ supplierReference: reference });
  }

  return NextResponse.json({ received: true, mapped });
}
