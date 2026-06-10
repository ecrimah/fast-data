import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { completePaidOrder } from '@/services/payment/complete-order';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ events: [] });

  const service = createServiceClient();
  const { data } = await service
    .from('payment_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return NextResponse.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { eventId, orderId } = await request.json();
  if (!eventId || !orderId) return NextResponse.json({ error: 'eventId and orderId required' }, { status: 400 });

  const service = createServiceClient();
  const { data: event } = await service.from('payment_events').select('*').eq('id', eventId).maybeSingle();
  const { data: order } = await service.from('orders').select('*').eq('id', orderId).maybeSingle();

  if (!event || !order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (event.matched_order_id) return NextResponse.json({ error: 'Already matched' }, { status: 409 });

  await service
    .from('payment_events')
    .update({ matched_order_id: orderId, matched_at: new Date().toISOString() })
    .eq('id', eventId);

  await completePaidOrder(orderId);
  return NextResponse.json({ ok: true });
}
