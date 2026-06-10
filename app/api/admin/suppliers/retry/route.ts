import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { dispatchOrderToSupplier } from '@/lib/suppliers/dispatch-order';

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Not configured' }, { status: 503 });

  const { orderId } = await request.json();
  if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

  const service = createServiceClient();
  await service
    .from('orders')
    .update({
      supplier_reference: null,
      supplier_order_code: null,
      supplier_status: null,
      supplier_error: null,
    })
    .eq('id', orderId);

  await dispatchOrderToSupplier(orderId);
  return NextResponse.json({ ok: true });
}
