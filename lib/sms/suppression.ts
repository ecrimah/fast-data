import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { normalizeGhanaPhone } from '@/lib/notifications/moolre-sms';

export type SuppressionReason = 'stop' | 'manual' | 'bounce' | 'complaint';

function notConfigured() {
  return { ok: false as const, error: 'Database not configured' };
}

/**
 * Add a number to the do-not-contact list and mark any matching contact as
 * unsubscribed. Idempotent.
 */
export async function suppressNumber(phoneRaw: string, reason: SuppressionReason = 'manual', note?: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const phone = normalizeGhanaPhone(phoneRaw);
  if (!phone) return { ok: false as const, error: 'Invalid phone number' };

  const service = createServiceClient();
  const { error } = await service
    .from('sms_suppression')
    .upsert({ phone, reason, note: note ?? null }, { onConflict: 'phone' });
  if (error) return { ok: false as const, error: error.message };

  await service.from('sms_contacts').update({ status: 'unsubscribed' }).eq('phone', phone);
  return { ok: true as const, phone };
}

export async function unsuppressNumber(phoneRaw: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const phone = normalizeGhanaPhone(phoneRaw);
  if (!phone) return { ok: false as const, error: 'Invalid phone number' };
  const service = createServiceClient();
  const { error } = await service.from('sms_suppression').delete().eq('phone', phone);
  return error ? { ok: false as const, error: error.message } : { ok: true as const, phone };
}

export async function listSuppression(limit = 200) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const { data, error } = await service
    .from('sms_suppression')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return error ? { ok: false as const, error: error.message } : { ok: true as const, entries: data ?? [] };
}

const STOP_KEYWORDS = ['stop', 'unsubscribe', 'unsub', 'cancel', 'end', 'quit', 'optout', 'opt-out'];

export function isStopKeyword(message: string): boolean {
  const normalized = message.trim().toLowerCase().replace(/[^a-z]/g, '');
  return STOP_KEYWORDS.some((kw) => normalized === kw.replace(/[^a-z]/g, ''));
}
