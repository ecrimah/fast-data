'use client';

import { useEffect, useMemo, useState } from 'react';
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
  EmptyNexus,
} from '@/components/admin/fds-ui';

type Order = {
  id: string;
  payment_ref: string;
  phone: string;
  network: string;
  bundle_size: string;
  amount: number;
  payment_status: string;
  delivery_status: string;
  supplier?: string | null;
  supplier_status?: string | null;
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending_payment', label: 'Awaiting pay' },
  { id: 'pending_delivery', label: 'To deliver' },
  { id: 'manual', label: 'Manual' },
  { id: 'supplier_failed', label: 'Supplier fail' },
  { id: 'delivered', label: 'Delivered' },
];

function OrderTable({
  orders,
  selected,
  onToggle,
  onFulfill,
  onDelete,
  showDeliver = true,
  showDelete = false,
}: {
  orders: Order[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onFulfill: (id: string) => void;
  onDelete?: (id: string) => void;
  showDeliver?: boolean;
  showDelete?: boolean;
}) {
  if (!orders.length) {
    return <EmptyNexus title="Nothing here" description="No orders in this section." />;
  }

  return (
    <NexusTable>
      <thead>
        <tr>
          <th />
          <th>Reference</th>
          <th>Bundle</th>
          <th>Pay</th>
          <th>Delivery</th>
          <th>Supplier</th>
          {showDeliver && <th>Action</th>}
          {showDelete && <th>Action</th>}
        </tr>
      </thead>
      <tbody>
        {orders.map((o) => (
          <tr key={o.id}>
            <td>
              <input type="checkbox" checked={selected.has(o.id)} onChange={() => onToggle(o.id)} />
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
            {showDeliver && (
              <td>
                {o.payment_status === 'paid' && o.delivery_status !== 'delivered' && (
                  <NexusBtn variant="gold" className="text-xs" onClick={() => onFulfill(o.id)}>
                    Deliver
                  </NexusBtn>
                )}
              </td>
            )}
            {showDelete && onDelete && (
              <td>
                <NexusBtn variant="danger" className="!px-2 !py-1 text-xs" onClick={() => onDelete(o.id)}>
                  Delete
                </NexusBtn>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </NexusTable>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
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

  const split = useMemo(() => {
    const pending = orders.filter((o) => o.payment_status === 'pending');
    const paid = orders.filter((o) => o.payment_status === 'paid');
    const failed = orders.filter((o) => o.payment_status === 'failed');
    return { pending, paid, failed };
  }, [orders]);

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

  const deleteOne = async (id: string) => {
    if (!confirm('Remove this unpaid order from the list?')) return;
    try {
      await adminFetch(`/api/admin/orders/${id}`, { method: 'DELETE' });
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  const bulkDeletePending = async () => {
    const pendingIds = [...selected].filter((id) => {
      const o = orders.find((x) => x.id === id);
      return o && (o.payment_status === 'pending' || o.payment_status === 'failed');
    });
    if (!pendingIds.length) return;
    if (!confirm(`Delete ${pendingIds.length} unpaid order(s)?`)) return;
    try {
      await adminFetch('/api/admin/orders/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ orderIds: pendingIds }),
      });
      setSelected(new Set());
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not delete');
    }
  };

  const selectedPendingCount = [...selected].filter((id) => {
    const o = orders.find((x) => x.id === id);
    return o && (o.payment_status === 'pending' || o.payment_status === 'failed');
  }).length;

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

  const showSplit = filter === 'all';

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Order operations"
        title="Order pipeline"
        description="Awaiting-payment and paid orders are kept in separate sections so nothing gets lost in the mix."
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
        {showSplit ? (
          <>
            <StatOrb tone="rose" label="Awaiting pay" value={String(split.pending.length)} />
            <StatOrb tone="emerald" label="Paid" value={String(split.paid.length)} />
          </>
        ) : (
          <StatOrb tone="sky" label="Showing" value={String(orders.length)} />
        )}
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
        ) : showSplit ? (
          <div className="space-y-8">
            <section>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-white">Awaiting payment</h3>
                <NexusPill tone={split.pending.length ? 'warn' : 'neutral'}>{split.pending.length}</NexusPill>
                <div className="flex-1" />
                {selectedPendingCount > 0 && (
                  <NexusBtn variant="danger" className="!py-1.5 !text-xs" onClick={bulkDeletePending}>
                    Delete selected ({selectedPendingCount})
                  </NexusBtn>
                )}
              </div>
              <p className="mb-3 text-xs text-white/45">
                Checkout started but MoMo not completed — safe to ignore or clean up.
              </p>
              <OrderTable
                orders={split.pending}
                selected={selected}
                onToggle={toggle}
                onFulfill={fulfillOne}
                onDelete={deleteOne}
                showDeliver={false}
                showDelete
              />
            </section>

            <section>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-bold text-white">Paid orders</h3>
                <NexusPill tone={split.paid.length ? 'success' : 'neutral'}>{split.paid.length}</NexusPill>
              </div>
              <p className="mb-3 text-xs text-white/45">Confirmed payments — deliver, track supplier, or export.</p>
              <OrderTable orders={split.paid} selected={selected} onToggle={toggle} onFulfill={fulfillOne} />
            </section>

            {split.failed.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-bold text-white">Failed payments</h3>
                  <NexusPill tone="danger">{split.failed.length}</NexusPill>
                </div>
                <OrderTable
                  orders={split.failed}
                  selected={selected}
                  onToggle={toggle}
                  onFulfill={fulfillOne}
                  onDelete={deleteOne}
                  showDeliver={false}
                  showDelete
                />
              </section>
            )}
          </div>
        ) : filter === 'pending_payment' ? (
          <OrderTable
            orders={orders}
            selected={selected}
            onToggle={toggle}
            onFulfill={fulfillOne}
            onDelete={deleteOne}
            showDeliver={false}
            showDelete
          />
        ) : (
          <OrderTable orders={orders} selected={selected} onToggle={toggle} onFulfill={fulfillOne} />
        )}
      </GlassPanel>
    </NexusPage>
  );
}
