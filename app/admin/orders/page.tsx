'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { adminFetch } from '@/lib/api/admin-client';
import { formatGHS } from '@/lib/admin-metrics';
import {
  GlassPanel,
  NexusBtn,
  NexusHeader,
  NexusPage,
  NexusPill,
  NexusTable,
  StatOrb,
} from '@/components/admin/fds-ui';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending_payment', label: 'Awaiting pay' },
  { id: 'pending_delivery', label: 'To deliver' },
  { id: 'manual', label: 'Manual' },
  { id: 'supplier_failed', label: 'Supplier fail' },
  { id: 'delivered', label: 'Delivered' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminFetch(`/api/admin/orders?filter=${filter}&q=${encodeURIComponent(q)}`)
      .then((d) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDeliver = async () => {
    if (!selected.size) return;
    await adminFetch('/api/admin/orders/bulk', {
      method: 'PATCH',
      body: JSON.stringify({ orderIds: [...selected], deliveryStatus: 'delivered' }),
    });
    setSelected(new Set());
    load();
  };

  const fulfillOne = async (id: string) => {
    await adminFetch(`/api/admin/orders/${id}/fulfill`, { method: 'PATCH' });
    load();
  };

  const exportCsv = () => {
    const header = 'ref,network,bundle,phone,amount,payment,delivery,supplier\n';
    const rows = orders
      .map(
        (o) =>
          `${o.payment_ref},${o.network},${o.bundle_size},${o.phone},${o.amount},${o.payment_status},${o.delivery_status},${o.supplier ?? ''}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fds-orders-${Date.now()}.csv`;
    a.click();
  };

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Order operations"
        title="Order pipeline"
        description="Search, filter, bulk deliver, and export — full ops control."
        actions={
          <>
            <NexusBtn variant="ghost" onClick={exportCsv}>
              Export CSV
            </NexusBtn>
            <NexusBtn variant="gold" onClick={bulkDeliver} disabled={!selected.size}>
              Mark selected delivered
            </NexusBtn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatOrb tone="sky" label="Showing" value={String(orders.length)} />
        <StatOrb tone="gold" label="Selected" value={String(selected.size)} />
      </div>

      <GlassPanel>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <input
              className="fds-input pl-9"
              placeholder="Search ref, phone, network…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                  filter === f.id ? 'fds-btn-gold' : 'fds-btn-ghost'
                }`}
              >
                {f.label}
              </button>
            ))}
            <NexusBtn variant="ghost" onClick={load}>
              <RefreshCw className="h-3.5 w-3.5" />
            </NexusBtn>
          </div>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-white/40">Loading orders…</p>
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th />
                <th>Reference</th>
                <th>Bundle</th>
                <th>Pay</th>
                <th>Delivery</th>
                <th>Supplier</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggle(o.id)} />
                  </td>
                  <td>
                    <p className="font-bold text-gold-glow">{o.payment_ref}</p>
                    <p className="font-mono text-[10px] text-white/40">{o.phone}</p>
                  </td>
                  <td>
                    {o.network} · {o.bundle_size}
                    <p className="font-bold tabular-nums">{formatGHS(o.amount)}</p>
                  </td>
                  <td>
                    <NexusPill tone={o.payment_status === 'paid' ? 'success' : o.payment_status === 'pending' ? 'warn' : 'danger'}>
                      {o.payment_status}
                    </NexusPill>
                  </td>
                  <td>
                    <NexusPill tone={o.delivery_status === 'delivered' ? 'success' : 'warn'}>{o.delivery_status}</NexusPill>
                  </td>
                  <td className="text-xs">
                    {o.supplier || '—'}
                    <p className="text-white/40">{o.supplier_status || '—'}</p>
                  </td>
                  <td>
                    {o.payment_status === 'paid' && o.delivery_status !== 'delivered' && (
                      <NexusBtn variant="gold" className="text-xs" onClick={() => fulfillOne(o.id)}>
                        Deliver
                      </NexusBtn>
                    )}
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
