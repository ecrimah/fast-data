import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ rewards: [] });

  const service = createServiceClient();
  const { data } = await service.from('referral_rewards').select('*').order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ rewards: data ?? [] });
}
