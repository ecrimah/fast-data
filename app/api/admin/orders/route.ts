import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ orders: [] });

  const { searchParams } = new URL(request.url);
  const filter = searchParams.get('filter') ?? 'all';
  const q = searchParams.get('q')?.trim();

  const service = createServiceClient();
  let query = service.from('orders').select('*').order('created_at', { ascending: false }).limit(200);

  if (filter === 'pending_payment') query = query.eq('payment_status', 'pending');
  if (filter === 'pending_delivery') query = query.eq('payment_status', 'paid').neq('delivery_status', 'delivered');
  if (filter === 'delivered') query = query.eq('delivery_status', 'delivered');
  if (filter === 'failed') query = query.eq('payment_status', 'failed');
  if (filter === 'manual') query = query.eq('supplier_status', 'awaiting_manual');
  if (filter === 'supplier_failed') query = query.eq('supplier_status', 'failed');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let orders = data ?? [];
  if (q) {
    const lower = q.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.phone?.includes(q) ||
        o.payment_ref?.toLowerCase().includes(lower) ||
        o.network?.toLowerCase().includes(lower) ||
        o.id?.includes(lower)
    );
  }

  return NextResponse.json({ orders });
}
