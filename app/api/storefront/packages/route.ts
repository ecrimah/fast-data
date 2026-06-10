import { NextResponse } from 'next/server';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { PACKAGE_NETWORKS, type DataPackage, type PackageNetwork } from '@/lib/packages/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const empty: Record<PackageNetwork, DataPackage[]> = { MTN: [], Telecel: [], AT: [] };

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ packages: empty });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('data_packages')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('size_gb', { ascending: true });

  if (error) {
    return NextResponse.json({ packages: empty });
  }

  const grouped = { ...empty };
  for (const net of PACKAGE_NETWORKS) {
    grouped[net] = (data ?? []).filter((p) => p.network === net) as DataPackage[];
  }

  return NextResponse.json({ packages: grouped });
}
