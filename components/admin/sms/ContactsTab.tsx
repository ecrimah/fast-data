'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusBtn, NexusPill, NexusTable, StatOrb, EmptyNexus } from '@/components/admin/fds-ui';

type Contact = {
  id: string;
  phone: string;
  name: string | null;
  network: string | null;
  source: string;
  tags: string[];
  status: string;
};

type Stats = { total: number; subscribed: number; unsubscribed: number; suppressed: number };

export function ContactsTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [blob, setBlob] = useState('');
  const [source, setSource] = useState('datagroup');
  const [network, setNetwork] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    params.set('limit', '100');
    adminFetch(`/api/admin/sms/contacts?${params.toString()}`)
      .then((d) => {
        setContacts(d.contacts ?? []);
        setTotal(d.total ?? 0);
        setStats(d.stats ?? null);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doImport = async () => {
    if (!blob.trim()) {
      setNote('Paste some numbers first.');
      return;
    }
    setBusy(true);
    setNote('Importing…');
    try {
      const r = await adminFetch('/api/admin/sms/contacts', {
        method: 'POST',
        body: JSON.stringify({
          blob,
          source,
          network: network || undefined,
          tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        }),
      });
      if (r.ok) {
        setNote(
          `Imported ${r.imported} new · ${r.duplicates} already existed · ${r.suppressed} skipped (opted-out) · ${r.invalid} invalid.`
        );
        setBlob('');
        load();
      } else {
        setNote(r.error || 'Import failed');
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const importCustomers = async () => {
    setBusy(true);
    setNote('Pulling paid customers…');
    try {
      const r = await adminFetch('/api/admin/sms/contacts', {
        method: 'POST',
        body: JSON.stringify({ action: 'import_customers' }),
      });
      setNote(r.ok ? `Imported ${r.imported} customers.` : r.error || 'Failed');
      load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const removeContact = async (id: string) => {
    await adminFetch(`/api/admin/sms/contacts?id=${id}`, { method: 'DELETE' }).catch(() => {});
    load();
  };

  return (
    <div className="space-y-5">
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatOrb label="Total" value={String(stats.total)} tone="sky" />
          <StatOrb label="Subscribed" value={String(stats.subscribed)} tone="emerald" />
          <StatOrb label="Opted out" value={String(stats.unsubscribed)} tone="rose" />
          <StatOrb label="Suppressed" value={String(stats.suppressed)} tone="violet" />
        </div>
      )}

      <GlassPanel glow="sky" className="space-y-3">
        <h3 className="font-bold text-white">Import numbers</h3>
        <p className="text-xs text-white/45">
          Paste numbers (commas, spaces, or new lines). Ghana formats auto-normalize and duplicates/opt-outs are skipped.
          Optionally use <code>number, name</code> per line.
        </p>
        <textarea
          className="fds-input min-h-[120px] font-mono text-xs"
          value={blob}
          onChange={(e) => setBlob(e.target.value)}
          placeholder={'0244000000, Ama\n0205551234\n+233271112222'}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-bold text-white/50">Source label</label>
            <input className="fds-input mt-1" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-bold text-white/50">Network (optional)</label>
            <select className="fds-input mt-1" value={network} onChange={(e) => setNetwork(e.target.value)}>
              <option value="">Unknown</option>
              <option value="MTN">MTN</option>
              <option value="Telecel">Telecel</option>
              <option value="AT">AT</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-white/50">Tags (comma-sep)</label>
            <input className="fds-input mt-1" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="datagroup,june" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <NexusBtn variant="gold" onClick={doImport} disabled={busy}>
            Import numbers
          </NexusBtn>
          <NexusBtn variant="ghost" onClick={importCustomers} disabled={busy}>
            Import my paid customers
          </NexusBtn>
        </div>
        {note && <p className="text-xs text-white/55">{note}</p>}
      </GlassPanel>

      <GlassPanel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="font-bold text-white">Contacts ({total})</h3>
          <div className="flex-1" />
          <select
            className="fds-input !w-auto !py-1.5 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Opted out</option>
            <option value="bounced">Bounced</option>
          </select>
          <input
            className="fds-input !w-auto !py-1.5 text-xs"
            placeholder="Search number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
          />
          <NexusBtn variant="ghost" className="!py-1.5 !text-xs" onClick={load}>
            Filter
          </NexusBtn>
        </div>
        {contacts.length === 0 ? (
          <EmptyNexus title="No contacts" description="Import numbers above to build your audience." />
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th>Phone</th>
                <th>Name</th>
                <th>Network</th>
                <th>Source</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td className="font-mono text-xs">{c.phone}</td>
                  <td>{c.name ?? '—'}</td>
                  <td>{c.network ?? '—'}</td>
                  <td className="text-xs text-white/50">{c.source}</td>
                  <td>
                    <NexusPill tone={c.status === 'subscribed' ? 'success' : c.status === 'unsubscribed' ? 'danger' : 'warn'}>
                      {c.status}
                    </NexusPill>
                  </td>
                  <td>
                    <button className="text-xs text-rose-300 hover:text-rose-200" onClick={() => removeContact(c.id)}>
                      Delete
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
