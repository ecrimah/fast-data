'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusTable } from '@/components/admin/fds-ui';

export default function AdminMomoPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [matchOrderId, setMatchOrderId] = useState<Record<string, string>>({});

  const load = () => {
    adminFetch('/api/admin/payment-events').then((d) => setEvents(d.events ?? []));
    adminFetch('/api/admin/orders?filter=pending_payment').then((d) => setPendingOrders(d.orders ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const match = async (eventId: string) => {
    const orderId = matchOrderId[eventId];
    if (!orderId) return;
    await adminFetch('/api/admin/payment-events', {
      method: 'POST',
      body: JSON.stringify({ eventId, orderId }),
    });
    load();
  };

  const unmatched = events.filter((e) => !e.matched_order_id);

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Payments"
        title="MoMo match console"
        description="Manually link unmatched Moolre payment events to pending orders."
      />
      <GlassPanel glow="gold">
        {unmatched.length === 0 ? (
          <p className="py-8 text-center text-sm text-emerald-300">No unmatched payment events.</p>
        ) : (
          <NexusTable>
            <thead>
              <tr>
                <th>Received</th>
                <th>Amount</th>
                <th>Hint</th>
                <th>Match to order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {unmatched.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="font-bold tabular-nums">GH₵ {Number(e.amount ?? 0).toFixed(2)}</td>
                  <td className="text-xs">{e.reference_hint || e.transaction_id || '—'}</td>
                  <td>
                    <select
                      className="fds-input"
                      value={matchOrderId[e.id] ?? ''}
                      onChange={(ev) => setMatchOrderId((prev) => ({ ...prev, [e.id]: ev.target.value }))}
                    >
                      <option value="">Select order…</option>
                      {pendingOrders.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.payment_ref} · {o.phone} · GH₵ {o.amount}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <NexusBtn variant="gold" className="text-xs" onClick={() => match(e.id)}>
                      Match & fulfil
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
