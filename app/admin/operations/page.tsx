'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { formatGHS } from '@/lib/admin-metrics';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusPill, NexusTable } from '@/components/admin/fds-ui';

export default function AdminOperationsPage() {
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    adminFetch('/api/admin/orders?filter=pending_delivery').then((d) => setOrders(d.orders ?? []));
  }, []);

  const fulfill = async (id: string) => {
    await adminFetch(`/api/admin/orders/${id}/fulfill`, { method: 'PATCH' });
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Reconciliation"
        title="FIFO fulfilment queue"
        description="Paid orders waiting for delivery — oldest first. Clear this daily."
      />
      <GlassPanel glow="gold">
        {orders.length === 0 ? (
          <p className="py-10 text-center text-sm text-emerald-300">Queue is empty — you&apos;re caught up.</p>
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th>When</th>
                <th>Order</th>
                <th>Customer</th>
                <th>Supplier</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...orders].reverse().map((o) => (
                <tr key={o.id}>
                  <td className="text-xs text-white/45">{new Date(o.created_at).toLocaleString()}</td>
                  <td>
                    <span className="font-bold text-gold-glow">{o.payment_ref}</span>
                    <p>{o.network} · {o.bundle_size}</p>
                    <p className="font-bold">{formatGHS(o.amount)}</p>
                  </td>
                  <td className="font-mono text-xs">{o.phone}</td>
                  <td>
                    <NexusPill tone={o.supplier_status === 'awaiting_manual' ? 'warn' : 'info'}>
                      {o.supplier_status || o.supplier || 'pending'}
                    </NexusPill>
                  </td>
                  <td>
                    <NexusBtn variant="gold" className="text-xs" onClick={() => fulfill(o.id)}>
                      Mark delivered
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
