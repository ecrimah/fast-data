import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { getSupplierById } from '@/lib/suppliers/registry';

export async function POST(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const supplierId = new URL(request.url).searchParams.get('supplier')?.trim().toLowerCase() ?? 'skanka5';
  const client = getSupplierById(supplierId);

  if (!client?.ping) {
    return NextResponse.json({ error: 'Supplier not pingable' }, { status: 400 });
  }
  if (!client.isConfigured()) {
    return NextResponse.json({ error: `${supplierId} not configured` }, { status: 503 });
  }

  const result = await client.ping();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error ?? 'Ping failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, supplier: supplierId, data: result.raw });
}
