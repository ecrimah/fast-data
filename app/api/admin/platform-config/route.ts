import { NextResponse } from 'next/server';
import { assertAdminApi } from '@/lib/auth/admin-api';
import { getPlatformConfig, savePlatformConfig } from '@/lib/data/platform-config';
import { normalizePlatformConfig } from '@/lib/platform/config-types';

export async function GET(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const config = await getPlatformConfig();
  return NextResponse.json({ config });
}

export async function PATCH(request: Request) {
  const auth = await assertAdminApi(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const current = await getPlatformConfig();
    const merged = normalizePlatformConfig({ ...current, ...body });
    await savePlatformConfig(merged);
    return NextResponse.json({ config: merged });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Save failed' }, { status: 400 });
  }
}
