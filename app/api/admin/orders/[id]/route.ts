import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

const DELETABLE = new Set(['pending', 'failed']);

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await assertAdminApi(_request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { id } = await params;
  const service = createServiceClient();

  const { data: order } = await service
    .from('orders')
    .select('id, payment_ref, payment_status')
    .eq('id', id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (!DELETABLE.has(order.payment_status)) {
    return NextResponse.json({ error: 'Only unpaid or failed orders can be deleted' }, { status: 400 });
  }

  const { error } = await service.from('orders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, paymentRef: order.payment_ref });
}
