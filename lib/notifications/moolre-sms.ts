import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { getPlatformConfig } from '@/lib/data/platform-config';

export type SmsTemplate =
  | 'payment_received'
  | 'order_fulfilled'
  | 'wallet_topup_admin'
  | 'new_order_admin'
  | 'test';

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
}

/**
 * Validate that a string normalizes to a plausible Ghana MSISDN (233 + 9 digits).
 * Returns the normalized number or null.
 */
export function normalizeGhanaPhone(phone: string): string | null {
  const normalized = formatPhone(phone);
  return /^233\d{9}$/.test(normalized) ? normalized : null;
}

function uniqueSmsRef(seed?: string): string {
  return `${seed ?? 'sms'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export type BulkSmsMessage = { recipient: string; message: string; ref?: string };

/**
 * Low-level bulk send. Posts up to ~100 messages in a single Moolre call.
 * Does NOT log to sms_logs (campaigns track their own per-recipient status)
 * and does NOT enforce suppression — callers must filter first.
 */
export async function sendMoolreBulk(
  messages: BulkSmsMessage[],
  opts?: { senderId?: string }
): Promise<{ ok: boolean; error?: string; response?: unknown }> {
  if (!messages.length) return { ok: true };

  if ((!process.env.MOOLRE_API_VASKEY && !process.env.MOOLRE_SMS_API_KEY) || !process.env.MOOLRE_API_USER) {
    return { ok: false, error: 'Moolre SMS not configured' };
  }

  const config = await getPlatformConfig();
  const senderId = opts?.senderId || config.moolreSms.senderId || 'FDS';

  try {
    const res = await fetch('https://api.moolre.com/open/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-VASKEY': process.env.MOOLRE_API_VASKEY || process.env.MOOLRE_SMS_API_KEY || '',
      },
      body: JSON.stringify({
        type: 1,
        senderid: senderId,
        messages: messages.map((m) => ({
          recipient: formatPhone(m.recipient),
          message: m.message,
          ref: m.ref ?? uniqueSmsRef(),
        })),
      }),
    });
    const response = await res.json().catch(() => ({}));
    const ok = response?.status === 1;
    return ok ? { ok: true, response } : { ok: false, error: response?.message || 'Bulk send failed', response };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Bulk send error' };
  }
}

function renderTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{${key}\\}`, 'g'), val),
    template
  );
}

async function logSms(args: {
  template: string;
  recipient: string;
  message: string;
  status: 'sent' | 'failed' | 'skipped';
  providerResponse?: unknown;
  error?: string;
  triggeredBy?: string;
  context?: Record<string, unknown>;
}) {
  if (!hasSupabaseAdminConfig()) return;
  const service = createServiceClient();
  await service.from('sms_logs').insert({
    template: args.template,
    recipient: args.recipient,
    message: args.message,
    status: args.status,
    provider: 'moolre',
    provider_response: args.providerResponse ?? null,
    error: args.error ?? null,
    triggered_by: args.triggeredBy ?? null,
    context: args.context ?? null,
  });
}

export async function sendMoolreSms(args: {
  phone: string;
  message: string;
  template: SmsTemplate;
  ref?: string;
  triggeredBy?: string;
  context?: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const config = await getPlatformConfig();
  const recipient = formatPhone(args.phone);

  if (!config.moolreSms.enabled) {
    await logSms({
      template: args.template,
      recipient,
      message: args.message,
      status: 'skipped',
      error: 'SMS disabled in platform config',
      triggeredBy: args.triggeredBy,
      context: args.context,
    });
    return { ok: false, error: 'SMS disabled' };
  }

  if ((!process.env.MOOLRE_API_VASKEY && !process.env.MOOLRE_SMS_API_KEY) || !process.env.MOOLRE_API_USER) {
    await logSms({
      template: args.template,
      recipient,
      message: args.message,
      status: 'skipped',
      error: 'MOOLRE SMS API key or MOOLRE_API_USER not set',
      triggeredBy: args.triggeredBy,
      context: args.context,
    });
    return { ok: false, error: 'Moolre SMS not configured' };
  }

  // Moolre requires the SMS ref to be globally unique per send. Two notifications
  // for the same order (e.g. admin alert + customer receipt) share a payment ref,
  // so we append a unique suffix to avoid "ref is not unique" rejections.
  const uniqueRef = `${args.ref ?? args.template}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 7)}`;

  try {
    const res = await fetch('https://api.moolre.com/open/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-VASKEY': process.env.MOOLRE_API_VASKEY || process.env.MOOLRE_SMS_API_KEY || '',
      },
      body: JSON.stringify({
        type: 1,
        senderid: config.moolreSms.senderId || 'FDS',
        messages: [{ recipient, message: args.message, ref: uniqueRef }],
      }),
    });

    const result = await res.json();
    const ok = result.status === 1;

    await logSms({
      template: args.template,
      recipient,
      message: args.message,
      status: ok ? 'sent' : 'failed',
      providerResponse: result,
      error: ok ? undefined : result.message || 'Send failed',
      triggeredBy: args.triggeredBy,
      context: args.context,
    });

    return ok ? { ok: true } : { ok: false, error: result.message || 'Send failed' };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'SMS error';
    await logSms({
      template: args.template,
      recipient,
      message: args.message,
      status: 'failed',
      error,
      triggeredBy: args.triggeredBy,
      context: args.context,
    });
    return { ok: false, error };
  }
}

export async function smsPaymentReceived(args: {
  phone: string;
  amount: number;
  ref: string;
  triggeredBy?: string;
}) {
  const config = await getPlatformConfig();
  const message = renderTemplate(config.smsTemplates.paymentReceived, {
    amount: args.amount.toFixed(2),
    ref: args.ref,
  });
  return sendMoolreSms({
    phone: args.phone,
    message,
    template: 'payment_received',
    ref: args.ref,
    triggeredBy: args.triggeredBy,
    context: { amount: args.amount, ref: args.ref },
  });
}

export async function smsOrderFulfilled(args: {
  phone: string;
  bundle: string;
  ref: string;
  triggeredBy?: string;
}) {
  const config = await getPlatformConfig();
  const message = renderTemplate(config.smsTemplates.orderFulfilled, {
    bundle: args.bundle,
    phone: args.phone,
    ref: args.ref,
  });
  return sendMoolreSms({
    phone: args.phone,
    message,
    template: 'order_fulfilled',
    ref: args.ref,
    triggeredBy: args.triggeredBy,
    context: { bundle: args.bundle, ref: args.ref },
  });
}

export async function smsWalletTopUpAdmin(args: {
  amount: number;
  name: string;
  phone: string;
  ref: string;
  triggeredBy?: string;
}) {
  const config = await getPlatformConfig();
  const adminPhone = config.contact.supportWhatsApp || process.env.ADMIN_NOTIFY_PHONE || '';
  if (!adminPhone) return { ok: false, error: 'Admin notify phone not configured' };

  const message = renderTemplate(config.smsTemplates.walletTopUpAdmin, {
    amount: args.amount.toFixed(2),
    name: args.name,
    phone: args.phone,
    ref: args.ref,
  });

  return sendMoolreSms({
    phone: adminPhone,
    message,
    template: 'wallet_topup_admin',
    ref: args.ref,
    triggeredBy: args.triggeredBy,
    context: { amount: args.amount, name: args.name, phone: args.phone, type: 'wallet_topup' },
  });
}

export async function smsNewOrderAdmin(args: {
  network: string;
  bundle: string;
  phone: string;
  amount: number;
  ref: string;
  paymentMethod?: string;
}) {
  const config = await getPlatformConfig();
  const adminPhone = config.contact.supportWhatsApp || process.env.ADMIN_NOTIFY_PHONE || '';
  if (!adminPhone) return { ok: false, error: 'Admin notify phone not configured' };

  const method = (args.paymentMethod || 'momo').toUpperCase();
  const message = `FDS ADMIN: New ${method} order ${args.network} ${args.bundle} for ${args.phone}. GH₵${args.amount.toFixed(
    2
  )}. Ref: ${args.ref}.`;

  return sendMoolreSms({
    phone: adminPhone,
    message,
    template: 'new_order_admin',
    ref: args.ref,
    context: { type: 'new_order', network: args.network, bundle: args.bundle, amount: args.amount },
  });
}

export async function smsTest(args: { phone: string; message: string; triggeredBy?: string }) {
  return sendMoolreSms({
    phone: args.phone,
    message: args.message,
    template: 'test',
    triggeredBy: args.triggeredBy,
  });
}
