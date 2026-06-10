import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { smsTest } from '@/lib/notifications/moolre-sms';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ logs: [] });

  const service = createServiceClient();
  const { data } = await service.from('sms_logs').select('*').order('created_at', { ascending: false }).limit(100);
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { phone, message } = await request.json();
  if (!phone || !message) return NextResponse.json({ error: 'phone and message required' }, { status: 400 });

  const result = await smsTest({ phone, message, triggeredBy: auth.userId });
  return NextResponse.json(result);
}
