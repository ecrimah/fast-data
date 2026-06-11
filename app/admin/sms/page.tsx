'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusPill, NexusTable, EmptyNexus } from '@/components/admin/fds-ui';
import { ContactsTab } from '@/components/admin/sms/ContactsTab';
import { CampaignsTab } from '@/components/admin/sms/CampaignsTab';

type Tab = 'campaigns' | 'contacts' | 'suppression' | 'tools';

const TABS: { id: Tab; label: string }[] = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'suppression', label: 'Opt-outs' },
  { id: 'tools', label: 'Test & Logs' },
];

export default function AdminSmsPage() {
  const [tab, setTab] = useState<Tab>('campaigns');

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Communications"
        title="SMS Marketing"
        description="Build an audience, blast bulk campaigns with opt-out protection, and debug delivery — powered by Moolre SMS."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              tab === t.id ? 'bg-amber-400 text-royal' : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'campaigns' && <CampaignsTab />}
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'suppression' && <SuppressionTab />}
      {tab === 'tools' && <ToolsTab />}
    </NexusPage>
  );
}

function SuppressionTab() {
  const [entries, setEntries] = useState<{ phone: string; reason: string; note: string | null; created_at: string }[]>([]);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => adminFetch('/api/admin/sms/suppression').then((d) => setEntries(d.entries ?? [])).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!phone.trim()) return;
    const r = await adminFetch('/api/admin/sms/suppression', {
      method: 'POST',
      body: JSON.stringify({ phone, note }),
    }).catch((e) => ({ ok: false, error: e instanceof Error ? e.message : 'Failed' }));
    setMsg(r.ok ? 'Added to do-not-contact list.' : r.error || 'Failed');
    if (r.ok) {
      setPhone('');
      setNote('');
      load();
    }
  };

  const remove = async (p: string) => {
    await adminFetch(`/api/admin/sms/suppression?phone=${encodeURIComponent(p)}`, { method: 'DELETE' }).catch(() => {});
    load();
  };

  return (
    <div className="space-y-5">
      <GlassPanel glow="rose" className="space-y-3">
        <h3 className="font-bold text-white">Do-not-contact list</h3>
        <p className="text-xs text-white/45">
          Numbers here are never messaged by any campaign. People who reply STOP land here automatically.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="fds-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024XXXXXXX" />
          <input className="fds-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (optional)" />
        </div>
        <NexusBtn variant="danger" onClick={add}>
          Block number
        </NexusBtn>
        {msg && <p className="text-xs text-white/55">{msg}</p>}
      </GlassPanel>

      <GlassPanel>
        <h3 className="mb-3 font-bold text-white">Blocked ({entries.length})</h3>
        {entries.length === 0 ? (
          <EmptyNexus title="No opt-outs" description="Nobody has opted out yet." />
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th>Phone</th>
                <th>Reason</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.phone}>
                  <td className="font-mono text-xs">{e.phone}</td>
                  <td>
                    <NexusPill tone={e.reason === 'stop' ? 'danger' : 'neutral'}>{e.reason}</NexusPill>
                  </td>
                  <td className="text-xs text-white/50">{e.note ?? '—'}</td>
                  <td>
                    <button className="text-xs text-sky-300 hover:text-sky-200" onClick={() => remove(e.phone)}>
                      Unblock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </NexusTable>
        )}
      </GlassPanel>
    </div>
  );
}

function ToolsTab() {
  const [logs, setLogs] = useState<{ id: string; created_at: string; template: string; recipient: string; status: string }[]>([]);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('FDS test message from SMS hub.');
  const [result, setResult] = useState('');

  const load = () => adminFetch('/api/admin/sms').then((d) => setLogs(d.logs ?? [])).catch(() => {});

  useEffect(() => {
    load();
  }, []);

  const sendTest = async () => {
    setResult('Sending…');
    try {
      const r = await adminFetch('/api/admin/sms', {
        method: 'POST',
        body: JSON.stringify({ phone, message }),
      });
      setResult(r.ok ? 'Sent via Moolre' : r.error || 'Failed');
      load();
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="space-y-5">
      <GlassPanel glow="sky" className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-bold text-white/50">Test phone</label>
          <input className="fds-input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="024XXXXXXX" />
        </div>
        <div>
          <label className="text-xs font-bold text-white/50">Message</label>
          <input className="fds-input mt-1" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <NexusBtn variant="gold" onClick={sendTest}>
          Send test SMS
        </NexusBtn>
        {result && <p className="text-xs text-white/50">{result}</p>}
      </GlassPanel>

      <GlassPanel>
        <h3 className="mb-3 font-bold text-white">SMS log</h3>
        <NexusTable>
          <thead>
            <tr>
              <th>Time</th>
              <th>Template</th>
              <th>To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-xs">{new Date(log.created_at).toLocaleString()}</td>
                <td>{log.template}</td>
                <td className="font-mono text-xs">{log.recipient}</td>
                <td>
                  <NexusPill tone={log.status === 'sent' ? 'success' : log.status === 'skipped' ? 'neutral' : 'danger'}>
                    {log.status}
                  </NexusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </NexusTable>
      </GlassPanel>
    </div>
  );
}
