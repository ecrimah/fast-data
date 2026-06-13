import { NextResponse } from 'next/server';
import { trackVisitor, type VisitorIntent } from '@/lib/visitors';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';

const INTENTS: VisitorIntent[] = ['visited', 'browsed', 'checkout_started', 'abandoned', 'purchased'];

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = checkRateLimit(`track:${ip}`, { max: 60, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ ok: false }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } });
  }

  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  if (!sessionId) return NextResponse.json({ ok: false, error: 'sessionId required' }, { status: 400 });

  const intent = INTENTS.includes(body.intent) ? (body.intent as VisitorIntent) : 'visited';

  const result = await trackVisitor({
    sessionId,
    phone: body.phone,
    name: body.name,
    interestNetwork: body.interestNetwork,
    interestBundle: body.interestBundle,
    intent,
    landingPage: body.landingPage,
    lastPage: body.lastPage,
    referrer: body.referrer,
    utm: body.utm && typeof body.utm === 'object' ? body.utm : {},
    userAgent: request.headers.get('user-agent'),
    ip,
  });

  // Never surface internal errors to the public beacon.
  return NextResponse.json({ ok: result.ok });
}
