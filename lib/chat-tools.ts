import 'server-only';

import { BUNDLE_SIZES } from '@/constants';
import { DeliveryStatus, Network, PaymentStatus } from '@/types';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { initMoolrePayment } from '@/lib/moolre-payment';
import { dispatchOrderToSupplier } from '@/lib/suppliers/dispatch-order';
import { notifyNewPaidOrder } from '@/lib/notifications/order-events';
import { getGuestUserId } from '@/lib/auth/guest-user';
import { SITE_KNOWLEDGE } from '@/lib/site-knowledge';
import { SITE } from '@/lib/brand';
import { getActivePackages, resolvePackagePrice } from '@/lib/packages/pricing';
import { PACKAGE_NETWORKS, toPackageNetwork } from '@/lib/packages/types';

export type ChatOrder = {
  id: string;
  payment_ref: string;
  network: string;
  bundle_size: string;
  amount: number;
  phone: string;
  payment_status: string;
  delivery_status: string;
  created_at: string;
};

export type ChatOrderResult = {
  ok: boolean;
  error?: string;
  order?: ChatOrder;
  paymentUrl?: string;
  paymentRef?: string;
  /** True when a Mobile Money approval prompt was pushed to the payer's phone. */
  promptSent?: boolean;
  /** Number the prompt was sent to. */
  paymentPhone?: string;
  /** Human-friendly status message (e.g. "prompt sent to your phone"). */
  paymentMessage?: string;
};

function normalizeNetwork(raw: string): Network | null {
  const n = raw.trim().toLowerCase();
  if (n.includes('mtn')) return Network.MTN;
  if (n.includes('telecel') || n.includes('vodafone') || n.includes('voda')) return Network.VODAFONE;
  if (n.includes('at') || n.includes('airtel') || n.includes('tigo')) return Network.AT;
  return null;
}

function normalizePhone(raw: string): string | null {
  let p = raw.replace(/\D/g, '');
  if (p.startsWith('233')) p = '0' + p.slice(3);
  if (p.length === 9) p = '0' + p;
  if (p.length === 10 && p.startsWith('0')) return p;
  return null;
}

async function getPricePerGb(): Promise<number> {
  if (!hasSupabaseAdminConfig()) return 6;
  const supabase = createServiceClient();
  const { data } = await supabase.from('settings').select('price_per_gb').single();
  return data?.price_per_gb ?? 6;
}

export async function listBundles(): Promise<{ network: string; size_gb: number; price_ghs: number; popular?: boolean }[]> {
  if (hasSupabaseAdminConfig()) {
    const all = await Promise.all(PACKAGE_NETWORKS.map((n) => getActivePackages(n)));
    const flat = all.flat();
    if (flat.length > 0) {
      return flat.map((p) => ({
        network: p.network,
        size_gb: p.size_gb,
        price_ghs: Number(p.price),
        popular: p.popular,
      }));
    }
  }

  const pricePerGb = await getPricePerGb();
  return BUNDLE_SIZES.map((size) => ({
    network: 'MTN',
    size_gb: size,
    price_ghs: +(size * pricePerGb).toFixed(2),
  }));
}

export async function getStoreInfo(): Promise<string> {
  const price = await getPricePerGb();
  return `${SITE_KNOWLEDGE}\n\nCurrent price: GH₵ ${price} per 1 GB.`;
}

export async function checkWallet(userId?: string): Promise<{ balance: number; signedIn: boolean }> {
  if (!userId || !hasSupabaseAdminConfig()) {
    return { balance: 0, signedIn: false };
  }
  const supabase = createServiceClient();
  const { data } = await supabase.from('profiles').select('wallet_balance').eq('id', userId).maybeSingle();
  return { balance: data?.wallet_balance ?? 0, signedIn: true };
}

export async function trackOrder(args: {
  paymentRef?: string;
  phone?: string;
}): Promise<{ found: boolean; orders: ChatOrder[]; message?: string }> {
  if (!hasSupabaseAdminConfig()) {
    return { found: false, orders: [], message: 'Order tracking unavailable right now.' };
  }

  const supabase = createServiceClient();
  let query = supabase
    .from('orders')
    .select('id, payment_ref, network, bundle_size, amount, phone, payment_status, delivery_status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (args.paymentRef) {
    query = query.ilike('payment_ref', `%${args.paymentRef.replace(/^(FDS|DTH)-/i, '')}%`);
  } else if (args.phone) {
    const phone = normalizePhone(args.phone);
    if (!phone) return { found: false, orders: [], message: 'Invalid phone number format.' };
    query = query.eq('phone', phone);
  } else {
    return { found: false, orders: [], message: `Provide a payment reference (${SITE.paymentRefPrefix}-...) or phone number.` };
  }

  const { data, error } = await query;
  if (error) return { found: false, orders: [], message: error.message };

  const orders = (data ?? []) as ChatOrder[];
  return { found: orders.length > 0, orders };
}

export async function createChatOrder(args: {
  network: string;
  sizeGb: number;
  phone: string;
  paymentMethod: 'moolre' | 'wallet';
  user?: { id: string; email: string; wallet_balance: number } | null;
  baseUrl: string;
  /** Mobile Money number to charge. Defaults to the beneficiary phone. */
  payerPhone?: string;
}): Promise<ChatOrderResult> {
  if (!hasSupabaseAdminConfig()) {
    return { ok: false, error: 'Ordering is unavailable. Please use the shop page.' };
  }

  const network = normalizeNetwork(args.network);
  if (!network) {
    return { ok: false, error: 'Invalid network. Choose MTN, Telecel, or AT.' };
  }

  const pkgNetwork = toPackageNetwork(network);
  const { price: amount } = await resolvePackagePrice(pkgNetwork, args.sizeGb);

  if (!amount || amount <= 0) {
    return { ok: false, error: `Invalid bundle size. Available sizes are configured in the shop.` };
  }

  const phone = normalizePhone(args.phone);
  if (!phone) {
    return { ok: false, error: 'Invalid Ghana phone number. Use format 024XXXXXXX.' };
  }

  if (args.paymentMethod === 'wallet' && !args.user?.id) {
    return { ok: false, error: 'Sign in to pay with wallet, or choose MoMo payment.' };
  }

  const supabase = createServiceClient();

  const guestUserId = await getGuestUserId();
  const userId = args.user?.id ?? guestUserId;

  if (!userId) {
    return {
      ok: false,
      error: 'Please sign in at /login to complete your order, or ask staff to enable guest chat orders.',
    };
  }

  if (args.paymentMethod === 'wallet' && args.user) {
    if (args.user.wallet_balance < amount) {
      return {
        ok: false,
        error: `Insufficient wallet balance. You have GH₵ ${args.user.wallet_balance.toFixed(2)} but need GH₵ ${amount.toFixed(2)}.`,
      };
    }

    const newBalance = args.user.wallet_balance - amount;
    const { error: balErr } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', userId);

    if (balErr) return { ok: false, error: 'Could not deduct wallet balance.' };

    await supabase.from('transactions').insert({
      user_id: userId,
      type: 'purchase',
      amount: -amount,
      status: 'completed',
      reference: `CHAT-${Date.now()}`,
    });
  }

  const paymentRef = `${SITE.paymentRefPrefix}-${Date.now()}`;
  const paymentStatus =
    args.paymentMethod === 'wallet' ? PaymentStatus.PAID : PaymentStatus.PENDING;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      network,
      bundle_size: `${args.sizeGb} GB`,
      amount,
      phone,
      payment_ref: paymentRef,
      payment_status: paymentStatus,
      delivery_status: DeliveryStatus.PENDING,
      payment_method: args.paymentMethod,
    })
    .select('id, payment_ref, network, bundle_size, amount, phone, payment_status, delivery_status, created_at')
    .single();

  if (orderErr || !order) {
    return { ok: false, error: orderErr?.message || 'Failed to create order.' };
  }

  if (args.paymentMethod === 'wallet') {
    notifyNewPaidOrder(order.id).catch(console.error);
    await dispatchOrderToSupplier(order.id);
    return {
      ok: true,
      order: order as ChatOrder,
      paymentRef: order.payment_ref,
    };
  }

  const payment = await initMoolrePayment({
    orderId: order.id,
    customerEmail: args.user?.email,
    baseUrl: args.baseUrl,
    payerPhone: args.payerPhone,
  });

  if (!payment.success) {
    return { ok: false, error: payment.message || 'Order created but payment could not be started.' };
  }

  return {
    ok: true,
    order: order as ChatOrder,
    paymentUrl: payment.url,
    paymentRef: order.payment_ref,
    promptSent: payment.promptSent,
    paymentPhone: payment.payer,
    paymentMessage: payment.message,
  };
}
