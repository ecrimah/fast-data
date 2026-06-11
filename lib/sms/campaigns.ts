import 'server-only';
import { createServiceClient, hasSupabaseAdminConfig } from '@/lib/supabase-admin';
import { sendMoolreBulk, type BulkSmsMessage } from '@/lib/notifications/moolre-sms';
import { resolveSegmentRecipients, type ContactSegment } from '@/lib/sms/contacts';

const OPT_OUT_SUFFIX = ' Reply STOP to opt out.';
// Single SMS = 160 GSM-7 chars; concatenated parts are 153 each.
const SINGLE_SMS_LEN = 160;
const MULTIPART_SMS_LEN = 153;

function notConfigured() {
  return { ok: false as const, error: 'Database not configured' };
}

/** Render {name}/{phone} style variables in a message body. */
export function renderMessage(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (msg, [key, val]) => msg.replace(new RegExp(`\\{${key}\\}`, 'g'), val || ''),
    template
  );
}

export function smsParts(message: string): number {
  const len = message.length;
  if (len <= SINGLE_SMS_LEN) return 1;
  return Math.ceil(len / MULTIPART_SMS_LEN);
}

function buildBody(template: string, name: string | null, appendOptOut: boolean): string {
  let body = renderMessage(template, { name: name ?? 'there', phone: '' });
  if (appendOptOut && !/stop to opt/i.test(body)) body += OPT_OUT_SUFFIX;
  return body;
}

export type CreateCampaignArgs = {
  name: string;
  message: string;
  segment: ContactSegment;
  senderId?: string;
  appendOptOut?: boolean;
  scheduledAt?: string | null;
  createdBy?: string;
};

/**
 * Create a campaign and snapshot its recipients into the queue. The audience is
 * frozen at creation time (subscribed contacts matching the segment, minus
 * suppressed numbers) so later list changes don't affect an in-flight blast.
 */
export async function createCampaign(args: CreateCampaignArgs): Promise<
  { ok: false; error: string } | { ok: true; id: string; total: number }
> {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  if (!args.name?.trim()) return { ok: false, error: 'Campaign name required' };
  if (!args.message?.trim()) return { ok: false, error: 'Message body required' };

  const service = createServiceClient();
  const appendOptOut = args.appendOptOut ?? true;

  const audience = await resolveSegmentRecipients(args.segment);
  if (!audience.ok) return audience;
  if (!audience.recipients.length) return { ok: false, error: 'No subscribed contacts match this segment' };

  const status = args.scheduledAt ? 'scheduled' : 'draft';
  const { data: campaign, error } = await service
    .from('sms_campaigns')
    .insert({
      name: args.name.trim(),
      message: args.message,
      sender_id: args.senderId ?? null,
      segment: args.segment,
      append_opt_out: appendOptOut,
      status,
      scheduled_at: args.scheduledAt ?? null,
      total_recipients: audience.recipients.length,
      created_by: args.createdBy ?? null,
    })
    .select('id')
    .single();
  if (error || !campaign) return { ok: false, error: error?.message ?? 'Failed to create campaign' };

  // Snapshot recipients with their rendered message, in chunks.
  const rows = audience.recipients.map((r) => ({
    campaign_id: campaign.id,
    contact_id: r.id,
    phone: r.phone,
    name: r.name,
    message: buildBody(args.message, r.name, appendOptOut),
    status: 'queued' as const,
  }));

  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error: insErr } = await service.from('sms_campaign_recipients').insert(chunk);
    if (insErr) {
      // Roll back the campaign so we don't leave a half-populated blast.
      await service.from('sms_campaigns').delete().eq('id', campaign.id);
      return { ok: false, error: insErr.message };
    }
  }

  return { ok: true, id: campaign.id, total: rows.length };
}

/**
 * Send the next batch of queued recipients for a campaign. Designed to be
 * called repeatedly (client-driven loop) until `done` is true. Each call sends
 * up to `batchSize` messages in a single Moolre bulk request.
 */
export async function sendCampaignBatch(
  campaignId: string,
  batchSize = 100
): Promise<
  | { ok: false; error: string }
  | { ok: true; done: boolean; sent: number; failed: number; remaining: number; status: string }
> {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();

  const { data: campaign, error: cErr } = await service
    .from('sms_campaigns')
    .select('*')
    .eq('id', campaignId)
    .maybeSingle();
  if (cErr || !campaign) return { ok: false, error: cErr?.message ?? 'Campaign not found' };

  if (campaign.status === 'paused' || campaign.status === 'cancelled') {
    return { ok: false, error: `Campaign is ${campaign.status}` };
  }
  if (campaign.status === 'completed') {
    return { ok: true, done: true, sent: 0, failed: 0, remaining: 0, status: 'completed' };
  }

  // Mark sending on first batch.
  if (campaign.status === 'draft' || campaign.status === 'scheduled') {
    await service
      .from('sms_campaigns')
      .update({ status: 'sending', started_at: new Date().toISOString() })
      .eq('id', campaignId);
  }

  const { data: batch, error: bErr } = await service
    .from('sms_campaign_recipients')
    .select('id, phone, name, message')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(Math.min(batchSize, 100));
  if (bErr) return { ok: false, error: bErr.message };

  if (!batch || !batch.length) {
    await service
      .from('sms_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId);
    return { ok: true, done: true, sent: 0, failed: 0, remaining: 0, status: 'completed' };
  }

  // Re-check suppression at send time (someone may have opted out since creation).
  const { data: suppressed } = await service
    .from('sms_suppression')
    .select('phone')
    .in('phone', batch.map((r) => r.phone));
  const blocked = new Set((suppressed ?? []).map((s) => s.phone));

  const toSend = batch.filter((r) => !blocked.has(r.phone));
  const toSkip = batch.filter((r) => blocked.has(r.phone));

  if (toSkip.length) {
    await service
      .from('sms_campaign_recipients')
      .update({ status: 'skipped', error: 'suppressed' })
      .in('id', toSkip.map((r) => r.id));
  }

  let sent = 0;
  let failed = 0;

  if (toSend.length) {
    const messages: BulkSmsMessage[] = toSend.map((r) => ({
      recipient: r.phone,
      message: r.message,
      ref: `camp-${campaignId.slice(0, 8)}-${r.id.slice(0, 8)}`,
    }));
    const result = await sendMoolreBulk(messages, { senderId: campaign.sender_id ?? undefined });
    const nowIso = new Date().toISOString();

    if (result.ok) {
      sent = toSend.length;
      await service
        .from('sms_campaign_recipients')
        .update({ status: 'sent', sent_at: nowIso, provider_response: result.response ?? null })
        .in('id', toSend.map((r) => r.id));
      // Stamp last_messaged_at on the underlying contacts.
      await service
        .from('sms_contacts')
        .update({ last_messaged_at: nowIso })
        .in('phone', toSend.map((r) => r.phone));
    } else {
      failed = toSend.length;
      await service
        .from('sms_campaign_recipients')
        .update({ status: 'failed', error: result.error ?? 'send failed', provider_response: result.response ?? null })
        .in('id', toSend.map((r) => r.id));
    }
  }

  // Update aggregate counters.
  await service
    .from('sms_campaigns')
    .update({
      sent_count: (campaign.sent_count ?? 0) + sent,
      failed_count: (campaign.failed_count ?? 0) + failed,
      skipped_count: (campaign.skipped_count ?? 0) + toSkip.length,
    })
    .eq('id', campaignId);

  const { count: remaining } = await service
    .from('sms_campaign_recipients')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('status', 'queued');

  const done = (remaining ?? 0) === 0;
  if (done) {
    await service
      .from('sms_campaigns')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', campaignId);
  }

  return {
    ok: true,
    done,
    sent,
    failed,
    remaining: remaining ?? 0,
    status: done ? 'completed' : 'sending',
  };
}

export async function listCampaigns(limit = 50) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const { data, error } = await service
    .from('sms_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return error ? { ok: false as const, error: error.message } : { ok: true as const, campaigns: data ?? [] };
}

export async function getCampaign(id: string) {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const { data, error } = await service.from('sms_campaigns').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false as const, error: error.message };
  if (!data) return { ok: false as const, error: 'Campaign not found' };
  return { ok: true as const, campaign: data };
}

export async function setCampaignStatus(id: string, status: 'paused' | 'sending' | 'cancelled') {
  if (!hasSupabaseAdminConfig()) return notConfigured();
  const service = createServiceClient();
  const { error } = await service.from('sms_campaigns').update({ status }).eq('id', id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}
