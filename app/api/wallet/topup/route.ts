import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { smsWalletTopUpAdmin } from '@/lib/notifications/moolre-sms';

export async function POST(request: Request) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authClient = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authErr,
  } = await authClient.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: profile, error: pErr } = await service
    .from('profiles')
    .select('id, name, phone, email, wallet_balance')
    .eq('id', user.id)
    .maybeSingle();

  if (pErr || !profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  if (amount > 500) {
    return NextResponse.json({ error: 'Maximum top-up request is GH₵500' }, { status: 400 });
  }

  const ref = `TOP-REQ-${Date.now()}`;

  await service.from('transactions').insert({
    user_id: user.id,
    type: 'topup',
    amount,
    status: 'pending',
    reference: ref,
  });

  smsWalletTopUpAdmin({
    amount,
    name: profile.name || profile.email || 'Customer',
    phone: profile.phone || 'N/A',
    ref,
    triggeredBy: user.id,
  }).catch(console.error);

  return NextResponse.json({
    ok: true,
    pending: true,
    message: 'Top-up request sent. Pay via MoMo and your wallet will be credited after admin confirmation.',
    reference: ref,
    wallet_balance: Number(profile.wallet_balance ?? 0),
  });
}
