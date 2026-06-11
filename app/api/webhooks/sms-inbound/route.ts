import { NextResponse } from 'next/server';
import { isStopKeyword, suppressNumber } from '@/lib/sms/suppression';

/**
 * Inbound SMS webhook (point Moolre's inbound/2-way SMS here).
 * When a recipient replies STOP / UNSUBSCRIBE / CANCEL we add them to the
 * suppression list so they are never messaged again. This protects the
 * sender-ID reputation and keeps campaigns compliant.
 *
 * Optional shared secret: set SMS_INBOUND_SECRET and pass ?secret=... so
 * randoms can't spam the endpoint. If unset, the endpoint stays open (Moolre
 * does not sign inbound by default).
 */
function extractField(body: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = body[key] ?? (body.data as Record<string, unknown> | undefined)?.[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

export async function POST(request: Request) {
  const expected = process.env.SMS_INBOUND_SECRET;
  if (expected) {
    const url = new URL(request.url);
    const provided = url.searchParams.get('secret') || request.headers.get('x-webhook-secret');
    if (provided !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const sender = extractField(body, ['sender', 'msisdn', 'from', 'phone', 'recipient', 'source']);
  const message = extractField(body, ['message', 'text', 'content', 'body', 'sms']) ?? '';

  if (!sender) {
    // Acknowledge so the provider doesn't retry, but nothing to do.
    return NextResponse.json({ ok: true, handled: false });
  }

  if (isStopKeyword(message)) {
    const result = await suppressNumber(sender, 'stop', 'Replied STOP via inbound SMS');
    return NextResponse.json({ ok: true, handled: result.ok, action: 'suppressed' });
  }

  return NextResponse.json({ ok: true, handled: false });
}
