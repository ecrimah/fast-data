import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { getNetworkSupplierMatrix } from '@/lib/suppliers/routing-db';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const suppliers = await getNetworkSupplierMatrix();
  return NextResponse.json({ suppliers });
}
