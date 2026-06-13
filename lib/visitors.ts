import 'server-only';

import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';

export type VisitorIntent = 'visited' | 'browsed' | 'checkout_started' | 'abandoned' | 'purchased';
export type VisitorStatus = 'new' | 'interested' | 'contacted' | 'converted' | 'ignored';

const INTENT_RANK: Record<VisitorIntent, number> = {
  visited: 0,
  browsed: 1,
  checkout_started: 2,
  abandoned: 3,
  purchased: 4,
};

export interface TrackVisitorInput {
  sessionId: string;
  phone?: string | null;
  name?: string | null;
  interestNetwork?: string | null;
  interestBundle?: string | null;
  intent?: VisitorIntent;
  landingPage?: string | null;
  lastPage?: string | null;
  referrer?: string | null;
  utm?: Record<string, string>;
  userAgent?: string | null;
  ip?: string | null;
}

function clean(value: string | null | undefined, max = 500): string | null {
  if (!value) return null;
  const trimmed = String(value).trim().slice(0, max);
  return trimmed || null;
}

/** Record or update a visitor by session id. Intent only ever moves forward. */
export async function trackVisitor(input: TrackVisitorInput) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: 'Not configured' };
  if (!input.sessionId) return { ok: false as const, error: 'sessionId required' };

  const service = createServiceClient();
  const sessionId = clean(input.sessionId, 80)!;

  const { data: existing } = await service
    .from('visitors')
    .select('id, page_views, intent, phone, name, interest_network, interest_bundle, landing_page')
    .eq('session_id', sessionId)
    .maybeSingle();

  const incomingIntent = input.intent ?? 'visited';

  if (!existing) {
    const { error } = await service.from('visitors').insert({
      session_id: sessionId,
      phone: clean(input.phone, 20),
      name: clean(input.name, 120),
      interest_network: clean(input.interestNetwork, 20),
      interest_bundle: clean(input.interestBundle, 40),
      intent: incomingIntent,
      landing_page: clean(input.landingPage, 300),
      last_page: clean(input.lastPage, 300),
      referrer: clean(input.referrer, 300),
      utm: input.utm ?? {},
      user_agent: clean(input.userAgent, 400),
      ip: clean(input.ip, 60),
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, created: true };
  }

  // Merge: keep the furthest intent, keep first non-null phone/name, bump views.
  const keepFurthestIntent =
    INTENT_RANK[incomingIntent] >= INTENT_RANK[(existing.intent as VisitorIntent) ?? 'visited']
      ? incomingIntent
      : (existing.intent as VisitorIntent);

  const { error } = await service
    .from('visitors')
    .update({
      phone: clean(input.phone, 20) ?? existing.phone,
      name: clean(input.name, 120) ?? existing.name,
      interest_network: clean(input.interestNetwork, 20) ?? existing.interest_network,
      interest_bundle: clean(input.interestBundle, 40) ?? existing.interest_bundle,
      intent: keepFurthestIntent,
      last_page: clean(input.lastPage, 300),
      page_views: (existing.page_views ?? 1) + 1,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, created: false };
}

export interface ListVisitorsParams {
  search?: string | null;
  status?: VisitorStatus | null;
  intent?: VisitorIntent | null;
  withPhoneOnly?: boolean;
  limit?: number;
}

export async function listVisitors(params: ListVisitorsParams = {}) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: 'Not configured' };
  const service = createServiceClient();

  let query = service
    .from('visitors')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(Math.min(params.limit ?? 200, 500));

  if (params.status) query = query.eq('status', params.status);
  if (params.intent) query = query.eq('intent', params.intent);
  if (params.withPhoneOnly) query = query.not('phone', 'is', null);
  if (params.search) {
    const term = params.search.replace(/[%,]/g, ' ').trim();
    if (term) query = query.or(`phone.ilike.%${term}%,name.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) return { ok: false as const, error: error.message };

  const { count: total } = await service.from('visitors').select('id', { count: 'exact', head: true });
  const { count: leads } = await service
    .from('visitors')
    .select('id', { count: 'exact', head: true })
    .not('phone', 'is', null);

  return { ok: true as const, visitors: data ?? [], total: total ?? 0, leads: leads ?? 0 };
}

export async function updateVisitor(
  id: string,
  fields: { status?: VisitorStatus; notes?: string | null }
) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: 'Not configured' };
  const service = createServiceClient();

  const updates: Record<string, unknown> = {};
  if (fields.status) updates.status = fields.status;
  if (fields.notes !== undefined) updates.notes = fields.notes ? String(fields.notes).slice(0, 1000) : null;
  if (!Object.keys(updates).length) return { ok: false as const, error: 'Nothing to update' };

  const { error } = await service.from('visitors').update(updates).eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteVisitor(id: string) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: 'Not configured' };
  const service = createServiceClient();
  const { error } = await service.from('visitors').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
