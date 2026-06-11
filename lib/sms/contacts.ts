import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { normalizeGhanaPhone } from '@/lib/notifications/moolre-sms';

export type ContactStatus = 'subscribed' | 'unsubscribed' | 'bounced';
export type Network = 'MTN' | 'Telecel' | 'AT';

export type SmsContact = {
  id: string;
  phone: string;
  name: string | null;
  network: Network | null;
  source: string;
  tags: string[];
  status: ContactStatus;
  last_messaged_at: string | null;
  created_at: string;
};

export type ContactSegment = {
  status?: ContactStatus;
  network?: Network;
  source?: string;
  tag?: string;
  search?: string;
};

function notConfigured() {
  return { ok: false as const, error: 'Database not configured' };
}

/**
 * Parse a free-text blob (pasted numbers / CSV) into normalized Ghana MSISDNs.
 * Accepts comma, space, newline, semicolon, or tab separators. For CSV lines
 * the first field is treated as the phone and an optional second as the name.
 */
export function parseContactBlob(blob: string): { phone: string; name?: string }[] {
  const out = new Map<string, { phone: string; name?: string }>();
  const lines = blob.split(/[\n;]+/);
  for (const line of lines) {
    const parts = line.split(/[,\t]/).map((p) => p.trim());
    // If the line has no comma/tab, it may be space-separated bare numbers.
    const candidates = parts.length > 1 ? [parts[0]] : line.split(/\s+/);
    const name = parts.length > 1 && !/\d{6,}/.test(parts[1]) ? parts[1] : undefined;
    for (const c of candidates) {
      const phone = normalizeGhanaPhone(c);
      if (phone && !out.has(phone)) out.set(phone, { phone, name });
    }
  }
  return Array.from(out.values());
}

export async function importContacts(args: {
  blob: string;
  source?: string;
  network?: Network;
  tags?: string[];
}): Promise<
  | { ok: false; error: string }
  | { ok: true; parsed: number; imported: number; duplicates: number; suppressed: number; invalid: number }
> {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();

  const rawCount = args.blob.split(/[\n;,\t\s]+/).filter(Boolean).length;
  const parsed = parseContactBlob(args.blob);
  const invalid = Math.max(0, rawCount - parsed.length);
  if (!parsed.length) {
    return { ok: true, parsed: 0, imported: 0, duplicates: 0, suppressed: 0, invalid };
  }

  // Drop anything on the suppression list — never re-import opted-out numbers.
  const phones = parsed.map((p) => p.phone);
  const { data: suppressed } = await service.from('sms_suppression').select('phone').in('phone', phones);
  const blocked = new Set((suppressed ?? []).map((s) => s.phone));
  const insertable = parsed.filter((p) => !blocked.has(p.phone));

  const rows = insertable.map((p) => ({
    phone: p.phone,
    name: p.name ?? null,
    network: args.network ?? null,
    source: args.source?.trim() || 'import',
    tags: args.tags ?? [],
    status: 'subscribed' as const,
  }));

  // Upsert on phone; ignore duplicates (don't overwrite existing contacts).
  const { data, error } = await service
    .from('sms_contacts')
    .upsert(rows, { onConflict: 'phone', ignoreDuplicates: true })
    .select('id');

  if (error) return { ok: false, error: error.message };

  const imported = data?.length ?? 0;
  return {
    ok: true,
    parsed: parsed.length,
    imported,
    duplicates: insertable.length - imported,
    suppressed: blocked.size,
    invalid,
  };
}

/** Pull existing customers (from orders) into the contact list as a warm segment. */
export async function importCustomerContacts(): Promise<
  { ok: false; error: string } | { ok: true; imported: number }
> {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();

  const { data: orders, error } = await service
    .from('orders')
    .select('phone, network')
    .eq('payment_status', 'paid')
    .limit(5000);
  if (error) return { ok: false, error: error.message };

  const byPhone = new Map<string, Network | null>();
  for (const o of orders ?? []) {
    const phone = normalizeGhanaPhone(o.phone ?? '');
    if (phone && !byPhone.has(phone)) {
      byPhone.set(phone, (o.network as Network) ?? null);
    }
  }
  if (!byPhone.size) return { ok: true, imported: 0 };

  const { data: suppressed } = await service
    .from('sms_suppression')
    .select('phone')
    .in('phone', Array.from(byPhone.keys()));
  const blocked = new Set((suppressed ?? []).map((s) => s.phone));

  const rows = Array.from(byPhone.entries())
    .filter(([phone]) => !blocked.has(phone))
    .map(([phone, network]) => ({
      phone,
      network,
      source: 'customer',
      status: 'subscribed' as const,
      tags: ['customer'],
    }));

  const { data, error: upErr } = await service
    .from('sms_contacts')
    .upsert(rows, { onConflict: 'phone', ignoreDuplicates: true })
    .select('id');
  if (upErr) return { ok: false, error: upErr.message };

  return { ok: true, imported: data?.length ?? 0 };
}

function applySegment<T>(query: T, segment: ContactSegment): T {
  // query is a Supabase filter builder; chaining returns the same builder type.
  let q = query as unknown as {
    eq: (col: string, val: unknown) => typeof q;
    contains: (col: string, val: unknown) => typeof q;
    ilike: (col: string, val: string) => typeof q;
  };
  if (segment.status) q = q.eq('status', segment.status);
  if (segment.network) q = q.eq('network', segment.network);
  if (segment.source) q = q.eq('source', segment.source);
  if (segment.tag) q = q.contains('tags', [segment.tag]);
  if (segment.search) {
    const term = segment.search.replace(/[%_,()]/g, '').slice(0, 40);
    if (term) q = q.ilike('phone', `%${term}%`);
  }
  return q as unknown as T;
}

export async function listContacts(args: {
  segment?: ContactSegment;
  limit?: number;
  offset?: number;
}): Promise<{ ok: false; error: string } | { ok: true; contacts: SmsContact[]; total: number }> {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const limit = Math.min(args.limit ?? 100, 500);
  const offset = args.offset ?? 0;

  let query = service.from('sms_contacts').select('*', { count: 'exact' });
  query = applySegment(query, args.segment ?? {});
  const { data, error, count } = await query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
  if (error) return { ok: false, error: error.message };
  return { ok: true, contacts: (data ?? []) as SmsContact[], total: count ?? 0 };
}

/** Resolve the audience for a campaign: subscribed contacts matching the segment, minus suppressed. */
export async function resolveSegmentRecipients(
  segment: ContactSegment
): Promise<{ ok: false; error: string } | { ok: true; recipients: { id: string; phone: string; name: string | null }[] }> {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();

  let query = service.from('sms_contacts').select('id, phone, name');
  // Force subscribed-only regardless of caller segment.
  query = applySegment(query, { ...segment, status: 'subscribed' });
  const { data, error } = await query.limit(20000);
  if (error) return { ok: false, error: error.message };

  const contacts = data ?? [];
  if (!contacts.length) return { ok: true, recipients: [] };

  const { data: suppressed } = await service
    .from('sms_suppression')
    .select('phone')
    .in('phone', contacts.map((c) => c.phone));
  const blocked = new Set((suppressed ?? []).map((s) => s.phone));

  return {
    ok: true,
    recipients: contacts.filter((c) => !blocked.has(c.phone)),
  };
}

export async function deleteContact(id: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const { error } = await service.from('sms_contacts').delete().eq('id', id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function setContactStatus(id: string, status: ContactStatus) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const { error } = await service.from('sms_contacts').update({ status }).eq('id', id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function contactStats(): Promise<
  { ok: false; error: string } | { ok: true; total: number; subscribed: number; unsubscribed: number; suppressed: number }
> {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const [all, subbed, unsubbed, supp] = await Promise.all([
    service.from('sms_contacts').select('*', { count: 'exact', head: true }),
    service.from('sms_contacts').select('*', { count: 'exact', head: true }).eq('status', 'subscribed'),
    service.from('sms_contacts').select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
    service.from('sms_suppression').select('*', { count: 'exact', head: true }),
  ]);
  return {
    ok: true,
    total: all.count ?? 0,
    subscribed: subbed.count ?? 0,
    unsubscribed: unsubbed.count ?? 0,
    suppressed: supp.count ?? 0,
  };
}
