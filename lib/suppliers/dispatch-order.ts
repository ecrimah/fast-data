import 'server-only';

import { getSupplierForNetwork, getNetworkSupplierMatrix as matrixFromDb } from './routing-db';
import type { SupplierNetworkSlug } from './types';
import { Network, DeliveryStatus, PaymentStatus } from '@/types';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export function toSupplierNetwork(network: Network): SupplierNetworkSlug {
  switch (network) {
    case Network.MTN:
      return 'mtn';
    case Network.VODAFONE:
      return 'telecel';
    case Network.AT:
      return 'at';
    default:
      return 'mtn';
  }
}

export function parseBundleSizeGb(bundleSize: string): number {
  const match = bundleSize.match(/([\d.]+)/);
  return match ? Number(match[1]) : 1;
}

/** Dispatch a paid order to Skanka5 / SuccessBiz / manual supplier. */
export async function dispatchOrderToSupplier(orderId: string): Promise<void> {
  if (!hasSupabaseAdminConfig()) return;

  const service = createServiceClient();
  const { data: order, error } = await service
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    console.error('[dispatch]', error);
    return;
  }

  if (order.payment_status !== PaymentStatus.PAID) return;
  if (order.delivery_status === DeliveryStatus.DELIVERED) return;
  if (order.supplier_reference) return;

  const network = toSupplierNetwork(order.network as Network);
  const sizeGb = parseBundleSizeGb(order.bundle_size);
  const volumeMb = Math.round(sizeGb * 1024);
  const supplier = await getSupplierForNetwork(network);

  const result = await supplier.submitSingle({
    network,
    msisdn: order.phone,
    volumeMb,
    reference: order.payment_ref,
    scope: 'customer_order',
  });

  const updates: Record<string, unknown> = {
    supplier: supplier.id,
    supplier_submitted_at: new Date().toISOString(),
  };

  if (result.manual) {
    updates.supplier_status = 'awaiting_manual';
    await service.from('orders').update(updates).eq('id', order.id);
    return;
  }

  if (!result.ok) {
    updates.supplier_status = 'failed';
    updates.supplier_error = (result.error ?? 'Supplier error').slice(0, 500);
    await service.from('orders').update(updates).eq('id', order.id);
    return;
  }

  updates.supplier_reference = result.reference ?? null;
  updates.supplier_order_code = result.orderCode ?? null;
  updates.supplier_status = result.status ?? 'processing';

  await service.from('orders').update(updates).eq('id', order.id);
}

/** Mark order delivered when supplier webhook confirms fulfilment. */
export async function markOrderFulfilledByReference(args: {
  supplierReference?: string;
  orderCode?: string;
}): Promise<boolean> {
  if (!hasSupabaseAdminConfig()) return false;

  const service = createServiceClient();
  let query = service.from('orders').select('id').limit(1);

  if (args.orderCode) {
    query = query.eq('supplier_order_code', args.orderCode);
  } else if (args.supplierReference) {
    query = query.eq('supplier_reference', args.supplierReference);
  } else {
    return false;
  }

  const { data } = await query.maybeSingle();
  if (!data?.id) return false;

  await service
    .from('orders')
    .update({
      delivery_status: DeliveryStatus.DELIVERED,
      supplier_status: 'fulfilled',
      supplier_fulfilled_at: new Date().toISOString(),
    })
    .eq('id', data.id);

  return true;
}

export async function getNetworkSupplierMatrix() {
  return matrixFromDb();
}
