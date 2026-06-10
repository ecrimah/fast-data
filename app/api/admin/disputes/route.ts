import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ disputes: [] });

  const service = createServiceClient();
  const { data } = await service.from('disputes').select('*').order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ disputes: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { disputeId, status, resolution } = await request.json();
  const service = createServiceClient();
  await service
    .from('disputes')
    .update({
      status: status ?? 'resolved',
      resolution: resolution ?? null,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', disputeId);

  return NextResponse.json({ ok: true });
}
