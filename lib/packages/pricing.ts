import 'server-only';

import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { PRICE_PER_GB } from '@/constants';
import type { DataPackage, PackageNetwork } from './types';

/**
 * Resolve the authoritative price for a (network, size) combo.
 * Prefers an active configured package; otherwise falls back to the
 * legacy `size x price_per_gb` computation so nothing breaks if a
 * package was not configured.
 */
export async function resolvePackagePrice(
  network: PackageNetwork,
  sizeGb: number
): Promise<{ price: number; packageId: string | null; source: 'package' | 'computed' }> {
  if (hasSupabaseAdminConfig()) {
    const service = createServiceClient();
    const { data: pkg } = await service
      .from('data_packages')
      .select('id, price')
      .eq('network', network)
      .eq('size_gb', sizeGb)
      .eq('active', true)
      .maybeSingle();

    if (pkg) {
      return { price: Number(pkg.price), packageId: pkg.id, source: 'package' };
    }
  }

  const pricePerGb = await getDefaultPricePerGb();
  return { price: +(sizeGb * pricePerGb).toFixed(2), packageId: null, source: 'computed' };
}

/** Default per-GB price from settings, falling back to the constant. */
export async function getDefaultPricePerGb(): Promise<number> {
  if (!hasSupabaseAdminConfig()) return PRICE_PER_GB;
  const service = createServiceClient();
  const { data } = await service.from('settings').select('price_per_gb').eq('id', 1).maybeSingle();
  return data?.price_per_gb ?? PRICE_PER_GB;
}

/** All active packages for a network, ordered for display. */
export async function getActivePackages(network: PackageNetwork): Promise<DataPackage[]> {
  if (!hasSupabaseAdminConfig()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from('data_packages')
    .select('*')
    .eq('network', network)
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('size_gb', { ascending: true });
  return (data ?? []) as DataPackage[];
}
