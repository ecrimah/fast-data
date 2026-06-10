import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ promotions: [] });

  const service = createServiceClient();
  const { data } = await service.from('promotions').select('*').order('created_at', { ascending: false });
  return NextResponse.json({ promotions: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const body = await request.json();
  const service = createServiceClient();
  const { data, error } = await service
    .from('promotions')
    .insert({
      code: String(body.code).toUpperCase().trim(),
      title: body.title,
      description: body.description ?? null,
      discount_percent: body.discount_percent ?? null,
      discount_amount: body.discount_amount ?? null,
      active: body.active ?? true,
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ promotion: data });
}
