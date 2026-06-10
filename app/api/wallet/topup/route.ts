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

  const newBalance = Number(profile.wallet_balance ?? 0) + amount;
  const ref = `TOP-${Date.now()}`;

  const { error: uErr } = await service
    .from('profiles')
    .update({ wallet_balance: newBalance })
    .eq('id', user.id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

  await service.from('transactions').insert({
    user_id: user.id,
    type: 'topup',
    amount,
    status: 'completed',
    reference: ref,
  });

  smsWalletTopUpAdmin({
    amount,
    name: profile.name || profile.email || 'Customer',
    phone: profile.phone || 'N/A',
    ref,
    triggeredBy: user.id,
  }).catch(console.error);

  return NextResponse.json({ ok: true, wallet_balance: newBalance, reference: ref });
}
