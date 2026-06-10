import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ enabled: false, invited: 0, earned: 0, code: '' });
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
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const service = createServiceClient();

  const { data: settings } = await service.from('settings').select('referrals_enabled').eq('id', 1).maybeSingle();
  const enabled = settings?.referrals_enabled ?? false;

  const { data: profile } = await service
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .maybeSingle();

  const { count: invited } = await service
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by', user.id);

  const { data: rewards } = await service
    .from('referral_rewards')
    .select('amount')
    .eq('referrer_id', user.id)
    .eq('status', 'credited');

  const earned = (rewards ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  return NextResponse.json({
    enabled,
    code: profile?.referral_code ?? '',
    invited: invited ?? 0,
    earned,
  });
}
