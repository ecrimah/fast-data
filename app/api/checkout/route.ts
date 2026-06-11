import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { createChatOrder } from '@/lib/chat-tools';
import { checkRateLimit, clientIp } from '@/lib/security/rate-limit';

type Body = {
  network?: string;
  sizeGb?: number;
  phone?: string;
  paymentMethod?: 'moolre' | 'wallet';
};

/**
 * Server-side checkout. Orders are created with the service client so guests
 * can pay (RLS on the client blocks anon inserts) and the price is resolved
 * server-side — the client can never set its own amount. Wallet payments
 * require a verified Supabase session.
 */
export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ success: false, message: 'Checkout is unavailable right now.' }, { status: 503 });
  }

  const rate = checkRateLimit(`checkout:${clientIp(request)}`, { max: 20, windowMs: 60_000 });
  if (!rate.ok) {
    return NextResponse.json(
      { success: false, message: `Too many attempts. Wait ${rate.retryAfterSec}s and try again.` },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }

  const network = String(body.network ?? '').trim();
  const sizeGb = Number(body.sizeGb);
  const phone = String(body.phone ?? '').trim();
  const paymentMethod = body.paymentMethod === 'wallet' ? 'wallet' : 'moolre';

  if (!network || !sizeGb || sizeGb <= 0 || !phone) {
    return NextResponse.json({ success: false, message: 'Network, bundle size, and phone are required.' }, { status: 400 });
  }

  // Optional auth: required for wallet, optional for MoMo.
  let user: { id: string; email: string; wallet_balance: number } | null = null;
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const authClient = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const {
      data: { user: authUser },
    } = await authClient.auth.getUser();

    if (authUser) {
      const service = createServiceClient();
      const { data: profile } = await service
        .from('profiles')
        .select('id, email, wallet_balance')
        .eq('id', authUser.id)
        .maybeSingle();
      user = {
        id: authUser.id,
        email: profile?.email ?? authUser.email ?? 'customer@fastdataservices.store',
        wallet_balance: Number(profile?.wallet_balance ?? 0),
      };
    }
  }

  if (paymentMethod === 'wallet' && !user) {
    return NextResponse.json({ success: false, message: 'Please sign in to pay with your wallet.' }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin).replace(/\/+$/, '');

  const result = await createChatOrder({
    network,
    sizeGb,
    phone,
    paymentMethod,
    user,
    baseUrl,
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, message: result.error ?? 'Could not create order.' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    paymentMethod,
    orderId: result.order?.id,
    paymentRef: result.paymentRef,
    paymentUrl: result.paymentUrl ?? null,
  });
}
