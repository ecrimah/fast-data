'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import {
  NexusPage,
  NexusHeader,
  NexusBtn,
  NexusPill,
  NexusTable,
  GlassPanel,
  StatOrb,
  EmptyNexus,
} from '@/components/admin/fds-ui';
import { Users, RefreshCw, Phone, MessageCircle, Trash2 } from 'lucide-react';

type Visitor = {
  id: string;
  session_id: string;
  phone: string | null;
  name: string | null;
  interest_network: string | null;
  interest_bundle: string | null;
  intent: string;
  status: string;
  landing_page: string | null;
  last_page: string | null;
  referrer: string | null;
  utm: Record<string, string>;
  page_views: number;
  notes: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

const STATUSES = ['new', 'interested', 'contacted', 'converted', 'ignored'] as const;

const intentTone = (intent: string): 'success' | 'warn' | 'info' | 'neutral' => {
  if (intent === 'purchased') return 'success';
  if (intent === 'checkout_started') return 'warn';
  if (intent === 'browsed') return 'info';
  return 'neutral';
};

const intentLabel: Record<string, string> = {
  visited: 'Visited',
  browsed: 'Browsed',
  checkout_started: 'Reached checkout',
  abandoned: 'Abandoned',
  purchased: 'Purchased',
};

function waLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `233${digits.slice(1)}` : digits.startsWith('233') ? digits : digits;
  return `https://wa.me/${intl}`;
}

export default function AdminLeadsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [total, setTotal] = useState(0);
  const [leads, setLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [leadsOnly, setLeadsOnly] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (status) qs.set('status', status);
      if (leadsOnly) qs.set('leads', '1');
      const data = await adminFetch(`/api/admin/leads?${qs.toString()}`);
      setVisitors(data.visitors ?? []);
      setTotal(data.total ?? 0);
      setLeads(data.leads ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [search, status, leadsOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const setVisitorStatus = async (id: string, value: string) => {
    setVisitors((prev) => prev.map((v) => (v.id === id ? { ...v, status: value } : v)));
    await adminFetch(`/api/admin/leads/${id}`, { method: 'PATCH', body: JSON.stringify({ status: value }) }).catch(() => {});
  };

  const remove = async (id: string) => {
    setVisitors((prev) => prev.filter((v) => v.id !== id));
    await adminFetch(`/api/admin/leads/${id}`, { method: 'DELETE' }).catch(() => {});
  };

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Audience"
        title="Visitors & Leads"
        description="Everyone who lands on the store is captured here. Reach out to people who showed interest but didn't finish paying."
        actions={
          <NexusBtn variant="ghost" onClick={load}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </NexusBtn>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatOrb label="Total visitors" value={String(total)} tone="sky" />
        <StatOrb label="Leads (with phone)" value={String(leads)} tone="gold" hint="Reachable contacts" />
        <StatOrb label="Showing" value={String(visitors.length)} tone="violet" />
      </div>

      <GlassPanel className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="text-xs font-bold text-white/50">Search phone or name</label>
          <input
            className="fds-input mt-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="024XXXXXXX or name"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-white/50">Status</label>
          <select className="fds-input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-white/70">
          <input type="checkbox" checked={leadsOnly} onChange={(e) => setLeadsOnly(e.target.checked)} />
          Leads only (has phone)
        </label>
      </GlassPanel>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <GlassPanel>
        {visitors.length === 0 ? (
          <EmptyNexus
            icon={<Users size={40} />}
            title={loading ? 'Loading…' : 'No visitors yet'}
            description="As people visit the store, they'll appear here. Share your link to start capturing leads."
          />
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Interest</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Source</th>
                <th>Last seen</th>
                <th>Reach out</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.phone ? (
                      <div>
                        <p className="font-mono text-sm font-bold text-white">{v.phone}</p>
                        {v.name && <p className="text-xs text-white/50">{v.name}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-white/35">Anonymous · {v.page_views} views</span>
                    )}
                  </td>
                  <td className="text-xs">
                    {v.interest_network || v.interest_bundle ? (
                      <span className="text-white/80">
                        {v.interest_network ?? ''} {v.interest_bundle ?? ''}
                      </span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td>
                    <NexusPill tone={intentTone(v.intent)}>{intentLabel[v.intent] ?? v.intent}</NexusPill>
                  </td>
                  <td>
                    <select
                      className="fds-input !py-1 !text-xs"
                      value={v.status}
                      onChange={(e) => setVisitorStatus(v.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="text-xs text-white/50">
                    {v.utm?.utm_source ? (
                      <span>{v.utm.utm_source}</span>
                    ) : v.referrer ? (
                      <span className="truncate" title={v.referrer}>
                        {(() => {
                          try {
                            return new URL(v.referrer).hostname;
                          } catch {
                            return v.referrer;
                          }
                        })()}
                      </span>
                    ) : (
                      <span className="text-white/30">Direct</span>
                    )}
                  </td>
                  <td className="text-xs text-white/50">{new Date(v.last_seen_at).toLocaleString()}</td>
                  <td>
                    {v.phone ? (
                      <div className="flex gap-1">
                        <a
                          href={waLink(v.phone)}
                          target="_blank"
                          rel="noreferrer"
                          className="fds-btn fds-btn-gold !px-2 !py-1 !text-xs"
                          title="WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </a>
                        <a
                          href={`tel:${v.phone}`}
                          className="fds-btn fds-btn-ghost !px-2 !py-1 !text-xs"
                          title="Call"
                        >
                          <Phone size={13} />
                        </a>
                      </div>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td>
                    <NexusBtn variant="danger" className="!px-2 !py-1 !text-xs" onClick={() => remove(v.id)}>
                      <Trash2 size={13} />
                    </NexusBtn>
                  </td>
                </tr>
              ))}
            </tbody>
          </NexusTable>
        )}
      </GlassPanel>
    </NexusPage>
  );
}
