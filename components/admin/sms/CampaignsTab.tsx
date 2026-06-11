'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusBtn, NexusPill, NexusTable, EmptyNexus } from '@/components/admin/fds-ui';

type Campaign = {
  id: string;
  name: string;
  message: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  scheduled_at: string | null;
  created_at: string;
};

type Segment = { status?: string; network?: string; source?: string; tag?: string };

const SINGLE = 160;
const MULTI = 153;
function partsFor(len: number) {
  if (len === 0) return 0;
  return len <= SINGLE ? 1 : Math.ceil(len / MULTI);
}

function statusTone(s: string): 'success' | 'warn' | 'danger' | 'neutral' | 'info' {
  if (s === 'completed') return 'success';
  if (s === 'sending') return 'info';
  if (s === 'paused' || s === 'scheduled') return 'warn';
  if (s === 'cancelled') return 'danger';
  return 'neutral';
}

export function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('Hi {name}! Cheap non-expiry data at Fast Data Services. MTN/Telecel/AT from GH₵4.50. Order: fastdataservices.store');
  const [appendOptOut, setAppendOptOut] = useState(true);
  const [segment, setSegment] = useState<Segment>({ status: 'subscribed' });
  const [scheduledAt, setScheduledAt] = useState('');
  const [preview, setPreview] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<{ id: string; sent: number; failed: number; total: number } | null>(null);

  const load = () => adminFetch('/api/admin/sms/campaigns').then((d) => setCampaigns(d.campaigns ?? [])).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const cleanSegment = () => {
    const s: Segment = { status: 'subscribed' };
    if (segment.network) s.network = segment.network;
    if (segment.source) s.source = segment.source.trim();
    if (segment.tag) s.tag = segment.tag.trim();
    return s;
  };

  const runPreview = async () => {
    setNote('');
    try {
      const r = await adminFetch('/api/admin/sms/campaigns', {
        method: 'POST',
        body: JSON.stringify({ action: 'preview', segment: cleanSegment() }),
      });
      setPreview(r.count ?? 0);
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Preview failed');
    }
  };

  const drainCampaign = async (id: string, total: number) => {
    let sent = 0;
    let failed = 0;
    setProgress({ id, sent: 0, failed: 0, total });
    // Client-driven loop: keep sending batches until done.
    for (let i = 0; i < 1000; i++) {
      const r = await adminFetch(`/api/admin/sms/campaigns/${id}/send-batch`, {
        method: 'POST',
        body: JSON.stringify({ batchSize: 100 }),
      }).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : 'batch failed' }));
      if (!r.ok) {
        setNote(r.error || 'Sending stopped');
        break;
      }
      sent += r.sent ?? 0;
      failed += r.failed ?? 0;
      setProgress({ id, sent, failed, total });
      if (r.done) break;
      // brief pace so we don't hammer the provider
      await new Promise((res) => setTimeout(res, 400));
    }
    setProgress(null);
    setNote(`Done — ${sent} sent, ${failed} failed.`);
    load();
  };

  const createAndMaybeSend = async (sendNow: boolean) => {
    if (!name.trim() || !message.trim()) {
      setNote('Add a campaign name and message.');
      return;
    }
    setBusy(true);
    setNote('Building audience…');
    try {
      const created = await adminFetch('/api/admin/sms/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          name,
          message,
          appendOptOut,
          segment: cleanSegment(),
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        }),
      });
      if (!created.ok) {
        setNote(created.error || 'Could not create campaign');
        setBusy(false);
        return;
      }
      setName('');
      await load();
      if (sendNow) {
        await drainCampaign(created.id, created.total ?? 0);
      } else {
        setNote(`Campaign created with ${created.total} recipients.`);
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const launchExisting = async (c: Campaign) => {
    await drainCampaign(c.id, c.total_recipients);
  };

  const controlCampaign = async (id: string, status: string) => {
    await adminFetch(`/api/admin/sms/campaigns/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }).catch(() => {});
    load();
  };

  const bodyWithOptOut = appendOptOut && !/stop to opt/i.test(message) ? `${message} Reply STOP to opt out.` : message;
  const len = bodyWithOptOut.length;

  return (
    <div className="space-y-5">
      <GlassPanel glow="gold" className="space-y-4">
        <h3 className="font-bold text-white">Compose campaign</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-bold text-white/50">Campaign name</label>
            <input className="fds-input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="June MTN promo" />
          </div>
          <div>
            <label className="text-xs font-bold text-white/50">Schedule (optional)</label>
            <input
              type="datetime-local"
              className="fds-input mt-1"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-white/50">Message · use {'{name}'} for personalization</label>
          <textarea
            className="fds-input mt-1 min-h-[110px]"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="mt-1 flex items-center justify-between text-[11px] text-white/40">
            <span>
              {len} chars · {partsFor(len)} SMS part{partsFor(len) === 1 ? '' : 's'} per recipient
            </span>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={appendOptOut} onChange={(e) => setAppendOptOut(e.target.checked)} />
              Append &quot;Reply STOP to opt out&quot;
            </label>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-bold text-white/50">Network</label>
            <select
              className="fds-input mt-1"
              value={segment.network ?? ''}
              onChange={(e) => setSegment((s) => ({ ...s, network: e.target.value || undefined }))}
            >
              <option value="">All networks</option>
              <option value="MTN">MTN</option>
              <option value="Telecel">Telecel</option>
              <option value="AT">AT</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-white/50">Source</label>
            <input
              className="fds-input mt-1"
              value={segment.source ?? ''}
              onChange={(e) => setSegment((s) => ({ ...s, source: e.target.value || undefined }))}
              placeholder="e.g. customer, import"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-white/50">Tag</label>
            <input
              className="fds-input mt-1"
              value={segment.tag ?? ''}
              onChange={(e) => setSegment((s) => ({ ...s, tag: e.target.value || undefined }))}
              placeholder="e.g. datagroup"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <NexusBtn variant="ghost" onClick={runPreview} disabled={busy}>
            Preview audience
          </NexusBtn>
          {preview !== null && (
            <NexusPill tone={preview > 0 ? 'info' : 'warn'}>{preview} recipients</NexusPill>
          )}
          <div className="flex-1" />
          <NexusBtn variant="ghost" onClick={() => createAndMaybeSend(false)} disabled={busy}>
            Save draft
          </NexusBtn>
          <NexusBtn variant="gold" onClick={() => createAndMaybeSend(true)} disabled={busy}>
            {busy ? 'Working…' : 'Create & send now'}
          </NexusBtn>
        </div>
        {note && <p className="text-xs text-white/55">{note}</p>}
      </GlassPanel>

      <GlassPanel>
        <h3 className="mb-3 font-bold text-white">Campaigns</h3>
        {campaigns.length === 0 ? (
          <EmptyNexus title="No campaigns yet" description="Compose your first blast above." />
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Recipients</th>
                <th>Sent</th>
                <th>Failed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const live = progress?.id === c.id;
                const sent = live ? progress!.sent : c.sent_count;
                const failed = live ? progress!.failed : c.failed_count;
                const pct = c.total_recipients ? Math.round((sent / c.total_recipients) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="font-semibold text-white">{c.name}</div>
                      <div className="max-w-[260px] truncate text-[11px] text-white/40">{c.message}</div>
                    </td>
                    <td>
                      <NexusPill tone={statusTone(live ? 'sending' : c.status)}>{live ? 'sending' : c.status}</NexusPill>
                    </td>
                    <td>{c.total_recipients}</td>
                    <td>
                      {sent}
                      {live && <span className="ml-1 text-[10px] text-sky-300">{pct}%</span>}
                    </td>
                    <td className={failed > 0 ? 'text-rose-300' : ''}>{failed}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {['draft', 'scheduled', 'paused'].includes(c.status) && !live && (
                          <NexusBtn variant="gold" className="!px-2 !py-1 !text-[11px]" onClick={() => launchExisting(c)}>
                            Send
                          </NexusBtn>
                        )}
                        {c.status === 'sending' && !live && (
                          <NexusBtn variant="ghost" className="!px-2 !py-1 !text-[11px]" onClick={() => launchExisting(c)}>
                            Resume
                          </NexusBtn>
                        )}
                        {['draft', 'scheduled', 'sending', 'paused'].includes(c.status) && (
                          <NexusBtn
                            variant="danger"
                            className="!px-2 !py-1 !text-[11px]"
                            onClick={() => controlCampaign(c.id, 'cancelled')}
                          >
                            Cancel
                          </NexusBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </NexusTable>
        )}
      </GlassPanel>
    </div>
  );
}
