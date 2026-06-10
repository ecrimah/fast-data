import 'server-only';

import { getSupplierById, getSupplierIdForNetwork, getNetworkSupplierMatrix as matrixFromRegistry } from './registry';
import type { SupplierClient, SupplierNetworkSlug } from './types';

export function getResolvedSupplierForNetwork(network: SupplierNetworkSlug): SupplierClient {
  return getSupplierById(getSupplierIdForNetwork(network)) ?? getSupplierById('manual')!;
}

export function getNetworkSupplierMatrix() {
  return matrixFromRegistry();
}
