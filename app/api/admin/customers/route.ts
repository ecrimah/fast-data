import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { sanitizeIlikeTerm } from '@/lib/security/sanitize';

const ROLES = ['user', 'admin', 'agent'];

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ customers: [] });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();

  const service = createServiceClient();
  let query = service
    .from('profiles')
    .select('id, email, name, phone, role, wallet_balance, referral_code, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  if (search) {
    const s = sanitizeIlikeTerm(search);
    if (s) query = query.or(`email.ilike.%${s}%,phone.ilike.%${s}%,name.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ customers: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await request.json();
  const userId = body.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Customer id required' }, { status: 400 });

  const service = createServiceClient();

  // Wallet credit/debit with an audit trail in transactions.
  if (body.action === 'credit') {
    const amount = Number(body.amount);
    if (!amount || Number.isNaN(amount)) {
      return NextResponse.json({ error: 'Provide a non-zero amount' }, { status: 400 });
    }

    const { data: profile, error: pErr } = await service
      .from('profiles')
      .select('wallet_balance')
      .eq('id', userId)
      .maybeSingle();
    if (pErr || !profile) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

    const newBalance = Number(profile.wallet_balance ?? 0) + amount;
    if (newBalance < 0) return NextResponse.json({ error: 'Resulting balance cannot be negative' }, { status: 400 });

    const { error: uErr } = await service
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    await service.from('transactions').insert({
      user_id: userId,
      type: amount >= 0 ? 'topup' : 'purchase',
      amount,
      status: 'completed',
      reference: `ADMIN-${Date.now()}`,
    });

    return NextResponse.json({ ok: true, wallet_balance: newBalance });
  }

  // Role change.
  if (body.action === 'role') {
    if (!ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    const { error } = await service.from('profiles').update({ role: body.role }).eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, role: body.role });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
