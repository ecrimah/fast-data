import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { PaymentStatus } from '@/types';

export interface SupplierLogRow {
  id: string;
  supplier: string;
  eventType: string;
  scope: string | null;
  reference: string | null;
  supplierReference: string | null;
  httpStatus: number | null;
  ok: boolean | null;
  error: string | null;
  createdAt: string;
}

export interface SupplierSummary {
  totalLogs: number;
  failedSupplier: number;
  awaitingManual: number;
  pendingDelivery: number;
  last24hFailures: number;
}

export async function fetchSupplierLogs(limit = 80): Promise<SupplierLogRow[]> {
  if (!hasSupabaseAdminConfig()) return [];
  const service = createServiceClient();
  const { data, error } = await service
    .from('supplier_logs')
    .select('id, supplier, event_type, scope, reference, supplier_reference, http_status, ok, error, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((r) => ({
    id: r.id,
    supplier: r.supplier,
    eventType: r.event_type,
    scope: r.scope,
    reference: r.reference,
    supplierReference: r.supplier_reference,
    httpStatus: r.http_status,
    ok: r.ok,
    error: r.error,
    createdAt: r.created_at,
  }));
}

export async function fetchSupplierSummary(): Promise<SupplierSummary> {
  const empty = { totalLogs: 0, failedSupplier: 0, awaitingManual: 0, pendingDelivery: 0, last24hFailures: 0 };
  if (!hasSupabaseAdminConfig()) return empty;

  const service = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [logs, failed, manual, pending, recentFails] = await Promise.all([
    service.from('supplier_logs').select('*', { count: 'exact', head: true }),
    service.from('orders').select('id', { count: 'exact', head: true }).eq('supplier_status', 'failed'),
    service.from('orders').select('id', { count: 'exact', head: true }).eq('supplier_status', 'awaiting_manual'),
    service
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('payment_status', PaymentStatus.PAID)
      .neq('delivery_status', 'delivered'),
    service.from('supplier_logs').select('id', { count: 'exact', head: true }).eq('ok', false).gte('created_at', since),
  ]);

  return {
    totalLogs: logs.count ?? 0,
    failedSupplier: failed.count ?? 0,
    awaitingManual: manual.count ?? 0,
    pendingDelivery: pending.count ?? 0,
    last24hFailures: recentFails.count ?? 0,
  };
}

export async function fetchAwaitingManualOrders() {
  if (!hasSupabaseAdminConfig()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from('orders')
    .select('id, payment_ref, phone, network, bundle_size, amount, supplier, created_at')
    .eq('supplier_status', 'awaiting_manual')
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function fetchFailedSupplierOrders() {
  if (!hasSupabaseAdminConfig()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from('orders')
    .select('id, payment_ref, phone, network, bundle_size, supplier_error, supplier, created_at')
    .eq('supplier_status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50);
  return data ?? [];
}
