import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { getPlatformConfig, savePlatformConfig } from '@/lib/data/platform-config';
import type { NetworkSupplierId } from '@/lib/platform/config-types';

export async function PATCH(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json();
  const network = body.network as 'mtn' | 'telecel' | 'at';
  const supplier = body.supplier as NetworkSupplierId;

  if (!['mtn', 'telecel', 'at'].includes(network)) {
    return NextResponse.json({ error: 'Invalid network' }, { status: 400 });
  }
  if (!['manual', 'skanka5', 'successbizhub'].includes(supplier)) {
    return NextResponse.json({ error: 'Invalid supplier' }, { status: 400 });
  }

  const config = await getPlatformConfig();
  config.supplierRouting[network] = supplier;
  await savePlatformConfig(config);
  return NextResponse.json({ ok: true, routing: config.supplierRouting });
}
