import 'server-only';
import { SITE } from '@/lib/brand';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function emailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || `${SITE.name} <onboarding@resend.dev>`;
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  return { apiKey, from, adminEmail };
}

export async function sendEmail(args: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { apiKey, from } = emailConfig();
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' };

  const to = Array.isArray(args.to) ? args.to.filter(Boolean) : [args.to].filter(Boolean);
  if (!to.length) return { ok: false, error: 'No recipient' };

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject: args.subject, html: args.html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Email error' };
  }
}

type OrderEmailData = {
  name?: string;
  network: string;
  bundle: string;
  phone: string;
  amount: number;
  ref: string;
  paymentMethod?: string;
};

function shell(title: string, bodyRows: string, footer: string) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="background:#081F3F;padding:20px 24px">
      <h1 style="color:#fff;margin:0;font-size:18px">${SITE.name}</h1>
    </div>
    <div style="padding:24px">
      <h2 style="margin:0 0 16px;font-size:16px;color:#081F3F">${title}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155">${bodyRows}</table>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">${footer}</p>
    </div>
  </div>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#64748b">${label}</td><td style="padding:6px 0;text-align:right;font-weight:bold;color:#0f172a">${value}</td></tr>`;
}

export async function emailOrderReceiptCustomer(to: string, data: OrderEmailData) {
  if (!to) return { ok: false, error: 'No customer email' };
  const html = shell(
    'Thanks for your order — payment received',
    row('Reference', data.ref) +
      row('Package', `${data.network} · ${data.bundle}`) +
      row('Recipient', data.phone) +
      row('Amount', `GH₵ ${data.amount.toFixed(2)}`),
    'Your data is being processed and will arrive shortly. You will get an SMS once it is delivered.'
  );
  return sendEmail({ to, subject: `${SITE.name} — Order ${data.ref} confirmed`, html });
}

export async function emailNewOrderAdmin(data: OrderEmailData) {
  const { adminEmail } = emailConfig();
  if (!adminEmail) return { ok: false, error: 'ADMIN_EMAIL not set' };
  const html = shell(
    'New paid order received',
    row('Reference', data.ref) +
      row('Customer', data.name || 'Guest') +
      row('Package', `${data.network} · ${data.bundle}`) +
      row('Recipient', data.phone) +
      row('Amount', `GH₵ ${data.amount.toFixed(2)}`) +
      row('Payment', (data.paymentMethod || 'momo').toUpperCase()),
    'Check the admin dashboard or Tay Ops to track fulfilment.'
  );
  return sendEmail({ to: adminEmail, subject: `New order ${data.ref} — GH₵ ${data.amount.toFixed(2)}`, html });
}
