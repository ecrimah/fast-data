'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Zap } from 'lucide-react';
import { adminFetch } from '@/lib/api/admin-client';
import {
  GlassPanel,
  NexusBtn,
  NexusHeader,
  NexusPage,
  NexusPill,
  NexusTable,
  StatOrb,
} from '@/components/admin/fds-ui';

export default function AdminSuppliersPage() {
  const [data, setData] = useState<any>(null);
  const [routing, setRouting] = useState<Record<string, string>>({});
  const [pingResult, setPingResult] = useState<string>('');

  const load = () => {
    adminFetch('/api/admin/supplier-logs').then(setData).catch(console.error);
    adminFetch('/api/admin/suppliers').then((d) => {
      const map: Record<string, string> = {};
      for (const s of d.suppliers ?? []) map[s.network] = s.supplierId;
      setRouting(map);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const ping = async (supplier: string) => {
    setPingResult('Pinging…');
    try {
      const r = await adminFetch(`/api/admin/suppliers/ping?supplier=${supplier}`, { method: 'POST' });
      setPingResult(`${supplier}: OK — ${JSON.stringify(r.data).slice(0, 120)}`);
    } catch (e) {
      setPingResult(e instanceof Error ? e.message : 'Ping failed');
    }
  };

  const saveRouting = async (network: string, supplier: string) => {
    await adminFetch('/api/admin/suppliers/routing', {
      method: 'PATCH',
      body: JSON.stringify({ network, supplier }),
    });
    setRouting((prev) => ({ ...prev, [network]: supplier }));
  };

  const retry = async (orderId: string) => {
    await adminFetch('/api/admin/suppliers/retry', { method: 'POST', body: JSON.stringify({ orderId }) });
    load();
  };

  const resolveManual = async (orderId: string, outcome: 'fulfilled' | 'failed') => {
    await adminFetch('/api/admin/suppliers/manual-resolve', {
      method: 'POST',
      body: JSON.stringify({ orderId, outcome }),
    });
    load();
  };

  const summary = data?.summary;

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Fulfilment"
        title="Supplier console"
        description="Live routing, ping tests, failed queue, manual resolve, and API logs."
        actions={
          <NexusBtn variant="ghost" onClick={load}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </NexusBtn>
        }
      />

      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatOrb tone="sky" label="Log entries" value={String(summary.totalLogs)} />
          <StatOrb tone="rose" label="Failed" value={String(summary.failedSupplier)} />
          <StatOrb tone="gold" label="Manual queue" value={String(summary.awaitingManual)} />
          <StatOrb tone="gold" label="Pending delivery" value={String(summary.pendingDelivery)} />
          <StatOrb tone="violet" label="24h API fails" value={String(summary.last24hFailures)} />
        </div>
      )}

      <GlassPanel glow="gold">
        <h3 className="mb-3 font-bold text-white">Network routing (no redeploy)</h3>
        <div className="grid gap-3 md:grid-cols-3">
          {(['mtn', 'telecel', 'at'] as const).map((net) => (
            <div key={net} className="rounded-xl border border-white/8 bg-black/20 p-3">
              <p className="text-xs font-bold uppercase text-gold-glow">{net}</p>
              <select
                className="fds-input mt-2"
                value={routing[net] ?? 'manual'}
                onChange={(e) => saveRouting(net, e.target.value)}
              >
                <option value="skanka5">Skanka5</option>
                <option value="successbizhub">SuccessBiz</option>
                <option value="manual">Manual</option>
              </select>
              <NexusBtn variant="ghost" className="mt-2 w-full text-xs" onClick={() => ping(routing[net] || 'skanka5')}>
                <Zap className="h-3 w-3" /> Ping
              </NexusBtn>
            </div>
          ))}
        </div>
        {pingResult && <p className="mt-3 text-xs text-white/50">{pingResult}</p>}
      </GlassPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel glow="rose">
          <h3 className="mb-2 font-bold text-white">Failed orders</h3>
          <ul className="space-y-2 text-xs">
            {(data?.failed ?? []).map((o: any) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg bg-white/5 p-2">
                <span>{o.payment_ref} · {o.supplier_error?.slice(0, 40)}</span>
                <NexusBtn variant="gold" className="text-[10px]" onClick={() => retry(o.id)}>
                  Retry
                </NexusBtn>
              </li>
            ))}
          </ul>
        </GlassPanel>

        <GlassPanel glow="sky">
          <h3 className="mb-2 font-bold text-white">Awaiting manual</h3>
          <ul className="space-y-2 text-xs">
            {(data?.awaitingManual ?? []).map((o: any) => (
              <li key={o.id} className="rounded-lg bg-white/5 p-2">
                <p className="font-bold text-gold-glow">{o.payment_ref}</p>
                <p>{o.network} · {o.bundle_size} · {o.phone}</p>
                <div className="mt-2 flex gap-2">
                  <NexusBtn variant="gold" className="text-[10px]" onClick={() => resolveManual(o.id, 'fulfilled')}>
                    Fulfilled
                  </NexusBtn>
                  <NexusBtn variant="danger" className="text-[10px]" onClick={() => resolveManual(o.id, 'failed')}>
                    Failed
                  </NexusBtn>
                </div>
              </li>
            ))}
          </ul>
        </GlassPanel>
      </div>

      <GlassPanel>
        <h3 className="mb-3 font-bold text-white">Supplier API logs</h3>
        <NexusTable>
          <thead>
            <tr>
              <th>Time</th>
              <th>Supplier</th>
              <th>Event</th>
              <th>Ref</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(data?.logs ?? []).slice(0, 30).map((log: any) => (
              <tr key={log.id}>
                <td className="text-[10px] text-white/40">{new Date(log.createdAt).toLocaleString()}</td>
                <td>{log.supplier}</td>
                <td>{log.eventType}</td>
                <td className="font-mono text-xs">{log.reference}</td>
                <td>
                  <NexusPill tone={log.ok ? 'success' : 'danger'}>{log.ok ? 'OK' : 'FAIL'}</NexusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </NexusTable>
      </GlassPanel>
    </NexusPage>
  );
}
