import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export type MoolreInitResult = {
  success: boolean;
  /** Hosted-page URL (legacy embed/link flow). Empty for the direct USSD-prompt flow. */
  url?: string;
  /** True when a Mobile Money approval prompt was pushed to the payer's phone. */
  promptSent?: boolean;
  /** Number the prompt was sent to (233XXXXXXXXX). */
  payer?: string;
  message?: string;
  reference?: string;
};

/** Moolre debit channel codes for the Initiate Payment endpoint. */
function networkToChannel(network: string): string | null {
  const n = (network || '').trim().toLowerCase();
  if (n === 'mtn') return '13';
  if (n === 'telecel' || n === 'vodafone' || n === 'voda') return '6';
  if (n === 'at' || n === 'airteltigo' || n === 'tigo' || n === 'airtel') return '7';
  return null;
}

/** Normalize a Ghana number to Moolre's local 0XXXXXXXXX format (no country code). */
function toMoolrePayer(raw: string): string | null {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('233')) return `0${digits.slice(3)}`;
  if (digits.length === 10 && digits.startsWith('0')) return digits;
  if (digits.length === 9) return `0${digits}`;
  return null;
}

/**
 * Initiate a Mobile Money payment by sending a USSD approval prompt directly to
 * the payer's phone (Moolre "Initiate Payment" endpoint). Replaces the hosted
 * payment-link/Web POS flow, which depends on a Moolre terminal that the account
 * does not have configured.
 */
export async function initMoolrePayment(args: {
  orderId: string;
  customerEmail?: string;
  baseUrl: string;
  /** Mobile Money number to charge. Defaults to the order's beneficiary number. */
  payerPhone?: string;
}): Promise<MoolreInitResult> {
  const apiUser = process.env.MOOLRE_API_USER;
  const pubKey = process.env.MOOLRE_API_PUBKEY;
  const accountNumber = process.env.MOOLRE_ACCOUNT_NUMBER;

  if (!apiUser || !pubKey || !accountNumber) {
    return { success: false, message: 'Moolre payment is not configured' };
  }

  if (!hasSupabaseAdminConfig()) {
    return { success: false, message: 'Database not configured' };
  }

  const supabase = createServiceClient();
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, payment_ref, amount, payment_status, network, phone')
    .or(`id.eq.${args.orderId},payment_ref.eq.${args.orderId}`)
    .single();

  if (error || !order) {
    return { success: false, message: 'Order not found' };
  }

  if (order.payment_status === 'paid') {
    return { success: false, message: 'Order already paid' };
  }

  const channel = networkToChannel(order.network);
  if (!channel) {
    return { success: false, message: 'Unsupported network for Mobile Money payment' };
  }

  const payer = toMoolrePayer(args.payerPhone || order.phone);
  if (!payer) {
    return { success: false, message: 'Enter a valid Mobile Money number to charge.' };
  }

  const uniqueRef = `${order.payment_ref}-R${Date.now()}`;
  await supabase.from('orders').update({ moolre_external_ref: uniqueRef }).eq('id', order.id);

  const payload = {
    type: 1,
    channel,
    currency: 'GHS',
    payer,
    amount: String(order.amount),
    externalref: uniqueRef,
    reference: `Data bundle ${order.payment_ref}`,
    accountnumber: accountNumber,
  };

  let result: { status?: number | string; code?: string; message?: string; data?: unknown };
  try {
    const response = await fetch('https://api.moolre.com/open/transact/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': apiUser,
        'X-API-PUBKEY': pubKey,
      },
      body: JSON.stringify(payload),
    });
    result = await response.json().catch(() => ({}));
  } catch {
    return { success: false, message: 'Could not reach Moolre. Please try again.' };
  }

  const status = Number(result.status);

  // TP14 => the Moolre account still needs its one-time API payment verification.
  // The prompt is NOT sent in this case, so surface it as an error to investigate.
  if (result.code === 'TP14') {
    return {
      success: false,
      message: 'Mobile Money payments are pending account verification. Please contact support.',
    };
  }

  // status 1 => Moolre accepted the request and a USSD prompt is on its way.
  if (status === 1) {
    return {
      success: true,
      promptSent: true,
      payer,
      reference: typeof result.data === 'string' ? result.data : uniqueRef,
      message: 'A Mobile Money approval prompt has been sent to your phone.',
    };
  }

  return {
    success: false,
    message: result.message || 'Could not start Mobile Money payment. Please try again.',
  };
}
