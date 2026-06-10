import { Network } from '@/types';

export type PackageNetwork = 'MTN' | 'Telecel' | 'AT';

export interface DataPackage {
  id: string;
  network: PackageNetwork;
  size_gb: number;
  price: number;
  label: string | null;
  active: boolean;
  popular: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export const PACKAGE_NETWORKS: PackageNetwork[] = ['MTN', 'Telecel', 'AT'];

/** Map the storefront Network enum to the package network string. */
export function toPackageNetwork(network: Network): PackageNetwork {
  if (network === Network.MTN) return 'MTN';
  if (network === Network.VODAFONE) return 'Telecel';
  return 'AT';
}

export function packageLabel(pkg: Pick<DataPackage, 'label' | 'size_gb'>): string {
  if (pkg.label && pkg.label.trim()) return pkg.label.trim();
  return `${pkg.size_gb} GB`;
}
