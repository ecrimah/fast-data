import 'server-only';

import { fetchAdminNotifications } from '@/lib/data/notifications';
import { computeAdminMetrics, formatGHS } from '@/lib/admin-metrics';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { dispatchOrderToSupplier } from '@/lib/suppliers/dispatch-order';
import { completePaidOrder } from '@/services/payment/complete-order';
import { smsOrderFulfilled } from '@/lib/notifications/moolre-sms';
import { DeliveryStatus, PaymentStatus, type Order } from '@/types';

export type AdminChatCtx = { adminUserId: string };

function notConfigured() {
  return { ok: false as const, error: 'Database not configured' };
}

function summarizeOrder(o: Order) {
  return {
    id: o.id,
    payment_ref: o.payment_ref,
    network: o.network,
    bundle_size: o.bundle_size,
    amount: o.amount,
    phone: o.phone,
    payment_status: o.payment_status,
    delivery_status: o.delivery_status,
    supplier_status: o.supplier_status,
    created_at: o.created_at,
  };
}

async function findOrderByRefOrId(refOrId: string): Promise<Order | null> {
  if (!hasSupabaseAdminConfig()) return null;
  const service = createServiceClient();
  const trimmed = refOrId.trim();

  const byId = await service.from('orders').select('*').eq('id', trimmed).maybeSingle();
  if (byId.data) return byId.data as Order;

  const byRef = await service
    .from('orders')
    .select('*')
    .ilike('payment_ref', trimmed)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (byRef.data as Order | null) ?? null;
}

export async function getOpsSummary() {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const [alerts, service] = await Promise.all([
    fetchAdminNotifications(),
    Promise.resolve(createServiceClient()),
  ]);

  const { data: orders } = await service
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  const metrics = computeAdminMetrics((orders ?? []) as Order[]);

  return {
    ok: true as const,
    alerts,
    metrics: {
      gmv30d: formatGHS(metrics.gmv30d),
      ordersToday: metrics.ordersToday,
      pendingDelivery: metrics.pendingDelivery,
      pendingPayment: metrics.pendingPayment,
      fulfillmentRate: `${metrics.fulfillmentRate.toFixed(1)}%`,
      paymentSuccessRate: `${metrics.paymentSuccessRate.toFixed(1)}%`,
    },
  };
}

export async function listOrders(args: { filter?: string; query?: string; limit?: number }) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const filter = args.filter ?? 'all';
  const limit = Math.min(args.limit ?? 15, 50);
  const service = createServiceClient();
  let query = service.from('orders').select('*').order('created_at', { ascending: false }).limit(200);

  if (filter === 'pending_payment') query = query.eq('payment_status', 'pending');
  if (filter === 'pending_delivery') query = query.eq('payment_status', 'paid').neq('delivery_status', 'delivered');
  if (filter === 'delivered') query = query.eq('delivery_status', 'delivered');
  if (filter === 'failed') query = query.eq('payment_status', 'failed');
  if (filter === 'manual') query = query.eq('supplier_status', 'awaiting_manual');
  if (filter === 'supplier_failed') query = query.eq('supplier_status', 'failed');

  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };

  let orders = (data ?? []) as Order[];
  if (args.query?.trim()) {
    const q = args.query.trim().toLowerCase();
    orders = orders.filter(
      (o) =>
        o.phone?.includes(args.query!) ||
        o.payment_ref?.toLowerCase().includes(q) ||
        o.network?.toLowerCase().includes(q) ||
        o.id?.includes(q)
    );
  }

  return {
    ok: true as const,
    count: orders.length,
    orders: orders.slice(0, limit).map(summarizeOrder),
  };
}

export async function searchOrder(args: { payment_ref?: string; phone?: string }) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const service = createServiceClient();
  if (args.payment_ref?.trim()) {
    const order = await findOrderByRefOrId(args.payment_ref);
    return order
      ? { ok: true as const, orders: [summarizeOrder(order)] }
      : { ok: true as const, orders: [], message: 'No order found for that reference' };
  }

  if (args.phone?.trim()) {
    const phone = args.phone.replace(/\D/g, '');
    const { data } = await service
      .from('orders')
      .select('*')
      .or(`phone.ilike.%${phone}%,phone.ilike.%${phone.slice(-9)}%`)
      .order('created_at', { ascending: false })
      .limit(10);
    return { ok: true as const, orders: ((data ?? []) as Order[]).map(summarizeOrder) };
  }

  return { ok: false as const, error: 'Provide payment_ref or phone' };
}

export async function fulfillOrder(refOrId: string, ctx: AdminChatCtx) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const order = await findOrderByRefOrId(refOrId);
  if (!order) return { ok: false as const, error: 'Order not found' };

  const service = createServiceClient();
  await service
    .from('orders')
    .update({
      delivery_status: DeliveryStatus.DELIVERED,
      supplier_status: 'fulfilled',
      supplier_fulfilled_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  smsOrderFulfilled({
    phone: order.phone,
    bundle: order.bundle_size,
    ref: order.payment_ref,
    triggeredBy: ctx.adminUserId,
  }).catch(console.error);

  return { ok: true as const, order: summarizeOrder({ ...order, delivery_status: DeliveryStatus.DELIVERED }) };
}

export async function cancelOrder(
  refOrId: string,
  note: string | undefined,
  refundWallet: boolean | undefined
) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const order = await findOrderByRefOrId(refOrId);
  if (!order) return { ok: false as const, error: 'Order not found', ref_or_id: refOrId };

  if (order.delivery_status === DeliveryStatus.DELIVERED) {
    return { ok: false as const, error: 'Order already delivered — cannot cancel', ref_or_id: refOrId };
  }

  const service = createServiceClient();
  const cancelNote = note?.trim() || 'Cancelled by admin';

  if (order.payment_status === PaymentStatus.PENDING) {
    const { error } = await service
      .from('orders')
      .update({
        payment_status: PaymentStatus.FAILED,
        supplier_status: 'cancelled',
        supplier_error: cancelNote,
      })
      .eq('id', order.id);
    if (error) return { ok: false as const, error: error.message, ref_or_id: refOrId };
    return {
      ok: true as const,
      cancelled: summarizeOrder({
        ...order,
        payment_status: PaymentStatus.FAILED,
        supplier_status: 'cancelled',
      }),
      refunded: false,
    };
  }

  const { error } = await service
    .from('orders')
    .update({
      supplier_status: 'cancelled',
      supplier_error: cancelNote,
    })
    .eq('id', order.id);
  if (error) return { ok: false as const, error: error.message, ref_or_id: refOrId };

  let refunded = false;
  if (refundWallet && order.payment_method === 'wallet' && order.user_id) {
    const walletResult = await adjustCustomerWallet(order.user_id, Number(order.amount));
    refunded = walletResult.ok;
  }

  return {
    ok: true as const,
    cancelled: summarizeOrder({ ...order, supplier_status: 'cancelled' }),
    refunded,
  };
}

export async function cancelOrders(
  refOrIds: string[],
  note: string | undefined,
  refundWallet: boolean | undefined
) {
  if (!refOrIds.length) return { ok: false as const, error: 'Provide at least one order id or payment ref' };

  const results = [];
  for (const refOrId of refOrIds) {
    results.push(await cancelOrder(refOrId, note, refundWallet));
  }

  const cancelled = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  return {
    ok: cancelled > 0,
    cancelled,
    failed: failed.length,
    results,
  };
}

export async function retrySupplierOrder(orderId: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  if (!orderId?.trim()) return { ok: false as const, error: 'orderId required' };

  const service = createServiceClient();
  await service
    .from('orders')
    .update({
      supplier_reference: null,
      supplier_order_code: null,
      supplier_status: null,
      supplier_error: null,
    })
    .eq('id', orderId.trim());

  await dispatchOrderToSupplier(orderId.trim());
  return { ok: true as const, orderId: orderId.trim() };
}

export async function resolveManualOrder(
  orderId: string,
  outcome: 'fulfilled' | 'failed',
  note: string | undefined,
  ctx: AdminChatCtx
) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const service = createServiceClient();
  const { data: order } = await service
    .from('orders')
    .select('id, payment_ref, phone, bundle_size, supplier_status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order) return { ok: false as const, error: 'Order not found' };
  if (order.supplier_status !== 'awaiting_manual') {
    return { ok: false as const, error: 'Order is not awaiting manual fulfilment' };
  }

  const now = new Date().toISOString();

  if (outcome === 'fulfilled') {
    await service
      .from('orders')
      .update({
        delivery_status: DeliveryStatus.DELIVERED,
        supplier_status: 'manual_fulfilled',
        supplier_error: note ?? null,
        supplier_fulfilled_at: now,
      })
      .eq('id', orderId);

    smsOrderFulfilled({
      phone: order.phone,
      bundle: order.bundle_size,
      ref: order.payment_ref,
      triggeredBy: ctx.adminUserId,
    }).catch(console.error);

    return { ok: true as const, outcome: 'fulfilled' as const };
  }

  await service
    .from('orders')
    .update({
      supplier_status: 'manual_failed',
      supplier_error: note ?? 'Marked failed by admin',
    })
    .eq('id', orderId);

  return { ok: true as const, outcome: 'failed' as const };
}

export async function listUnmatchedPayments() {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const service = createServiceClient();
  const { data, error } = await service
    .from('payment_events')
    .select('id, amount, sender_phone, reference_hint, transaction_id, created_at, matched_order_id')
    .is('matched_order_id', null)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, events: data ?? [] };
}

export async function matchPayment(eventId: string, orderId: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const service = createServiceClient();
  const { data: event } = await service.from('payment_events').select('*').eq('id', eventId).maybeSingle();
  const { data: order } = await service.from('orders').select('*').eq('id', orderId).maybeSingle();

  if (!event || !order) return { ok: false as const, error: 'Event or order not found' };
  if (event.matched_order_id) return { ok: false as const, error: 'Payment already matched' };

  await service
    .from('payment_events')
    .update({ matched_order_id: orderId, matched_at: new Date().toISOString() })
    .eq('id', eventId);

  await completePaidOrder(orderId);
  return { ok: true as const, orderId, eventId };
}

export async function searchCustomers(search?: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const service = createServiceClient();
  let query = service
    .from('profiles')
    .select('id, email, name, phone, role, wallet_balance, referral_code, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (search?.trim()) {
    const s = search.trim();
    query = query.or(`email.ilike.%${s}%,phone.ilike.%${s}%,name.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, customers: data ?? [] };
}

export async function adjustCustomerWallet(userId: string, amount: number) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  if (!userId?.trim() || !amount || Number.isNaN(amount)) {
    return { ok: false as const, error: 'Valid userId and non-zero amount required' };
  }

  const service = createServiceClient();
  const { data: profile, error: pErr } = await service
    .from('profiles')
    .select('wallet_balance, email')
    .eq('id', userId)
    .maybeSingle();

  if (pErr || !profile) return { ok: false as const, error: 'Customer not found' };

  const newBalance = Number(profile.wallet_balance ?? 0) + amount;
  if (newBalance < 0) return { ok: false as const, error: 'Resulting balance cannot be negative' };

  await service.from('profiles').update({ wallet_balance: newBalance }).eq('id', userId);
  await service.from('transactions').insert({
    user_id: userId,
    type: amount >= 0 ? 'topup' : 'purchase',
    amount,
    status: 'completed',
    reference: `ADMIN-${Date.now()}`,
  });

  return { ok: true as const, email: profile.email, wallet_balance: newBalance };
}

export async function listPackages(network?: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const service = createServiceClient();
  let query = service
    .from('data_packages')
    .select('id, network, size_gb, price, active, popular, sort_order')
    .order('network')
    .order('sort_order')
    .order('size_gb');

  if (network?.trim()) query = query.eq('network', network.trim());

  const { data } = await query.limit(60);
  return { ok: true as const, packages: data ?? [] };
}

export async function updatePackage(
  id: string,
  patch: { price?: number; active?: boolean; popular?: boolean }
) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  if (!id?.trim()) return { ok: false as const, error: 'Package id required' };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.price !== undefined) update.price = Number(patch.price);
  if (patch.active !== undefined) update.active = Boolean(patch.active);
  if (patch.popular !== undefined) update.popular = Boolean(patch.popular);

  const service = createServiceClient();
  const { data, error } = await service.from('data_packages').update(update).eq('id', id).select().single();
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, package: data };
}

export async function updatePricePerGb(price: number) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  if (!price || price <= 0) return { ok: false as const, error: 'Valid price required' };

  const service = createServiceClient();
  const { error } = await service.from('settings').upsert({ id: 1, price_per_gb: price });
  if (error) return { ok: false as const, error: error.message };

  return { ok: true as const, price_per_gb: price };
}

export async function getAnalyticsSummary() {
  if (!hasSupabaseAdminConfig()) return notConfigured();

  const service = createServiceClient();
  const { data: orders } = await service.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
  const list = (orders ?? []) as Order[];
  const metrics = computeAdminMetrics(list);

  const byMethod: Record<string, number> = {};
  for (const o of list.filter((x) => x.payment_status === 'paid')) {
    byMethod[o.payment_method] = (byMethod[o.payment_method] ?? 0) + 1;
  }

  return {
    ok: true as const,
    gmv30d: formatGHS(metrics.gmv30d),
    ordersToday: metrics.ordersToday,
    ordersTotal: metrics.ordersTotal,
    delivered: metrics.delivered,
    failed: metrics.failed,
    fulfillmentRate: `${metrics.fulfillmentRate.toFixed(1)}%`,
    moolreShare: `${metrics.moolreShare.toFixed(1)}%`,
    walletShare: `${metrics.walletShare.toFixed(1)}%`,
    byNetwork: metrics.byNetwork,
    byMethod,
  };
}
