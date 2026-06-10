import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { getPlatformConfig } from '@/lib/data/platform-config';

export type SmsTemplate = 'payment_received' | 'order_fulfilled' | 'test';

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('233')) return digits;
  if (digits.startsWith('0')) return `233${digits.slice(1)}`;
  if (digits.length === 9) return `233${digits}`;
  return digits;
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

  if (!process.env.MOOLRE_API_VASKEY || !process.env.MOOLRE_API_USER) {
    await logSms({
      template: args.template,
      recipient,
      message: args.message,
      status: 'skipped',
      error: 'MOOLRE_API_VASKEY or MOOLRE_API_USER not set',
      triggeredBy: args.triggeredBy,
      context: args.context,
    });
    return { ok: false, error: 'Moolre SMS not configured' };
  }

  try {
    const res = await fetch('https://api.moolre.com/open/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-USER': process.env.MOOLRE_API_USER,
        'X-API-VASKEY': process.env.MOOLRE_API_VASKEY,
      },
      body: JSON.stringify({
        type: 1,
        senderid: config.moolreSms.senderId || 'FDS',
        messages: [{ recipient, message: args.message, ref: args.ref ?? undefined }],
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

export async function smsTest(args: { phone: string; message: string; triggeredBy?: string }) {
  return sendMoolreSms({
    phone: args.phone,
    message: args.message,
    template: 'test',
    triggeredBy: args.triggeredBy,
  });
}
