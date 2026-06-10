import 'server-only';
import { getPlatformConfig } from '@/lib/data/platform-config';
import { getSupplierById, getNetworkSupplierMatrix as matrixFromEnv } from './registry';
import type { SupplierClient, SupplierNetworkSlug } from './types';
import type { NetworkSupplierId } from '@/lib/platform/config-types';

const NETWORK_TO_ENV: Record<SupplierNetworkSlug, string> = {
  mtn: 'SUPPLIER_FOR_MTN',
  telecel: 'SUPPLIER_FOR_TELECEL',
  at: 'SUPPLIER_FOR_AT',
};

const DEFAULT_BY_NETWORK: Record<SupplierNetworkSlug, NetworkSupplierId> = {
  mtn: 'skanka5',
  telecel: 'manual',
  at: 'manual',
};

export async function getSupplierIdForNetwork(network: SupplierNetworkSlug): Promise<string> {
  const config = await getPlatformConfig();
  const adminOverride = config.supplierRouting[network];
  if (adminOverride) return adminOverride;

  const envVar = NETWORK_TO_ENV[network];
  const fromEnv = process.env[envVar]?.trim().toLowerCase() as NetworkSupplierId | undefined;
  if (fromEnv && getSupplierById(fromEnv)) return fromEnv;
  return DEFAULT_BY_NETWORK[network];
}

export async function getSupplierForNetwork(network: SupplierNetworkSlug): Promise<SupplierClient> {
  const id = await getSupplierIdForNetwork(network);
  return getSupplierById(id) ?? getSupplierById('manual')!;
}

export async function getNetworkSupplierMatrix() {
  const config = await getPlatformConfig();
  const envMatrix = matrixFromEnv();
  return envMatrix.map((row) => {
    const override = config.supplierRouting[row.network as SupplierNetworkSlug];
    if (!override) return row;
    const client = getSupplierById(override);
    if (!client) return row;
    return {
      network: row.network,
      supplierId: client.id,
      supplierLabel: client.label,
      configured: client.isConfigured(),
      manual: client.id === 'manual',
      source: 'admin' as const,
    };
  });
}
