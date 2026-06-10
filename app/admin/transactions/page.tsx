'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusHeader, NexusPage, NexusPill, NexusTable } from '@/components/admin/fds-ui';

export default function AdminTransactionsPage() {
  const [txns, setTxns] = useState<any[]>([]);

  useEffect(() => {
    adminFetch('/api/admin/transactions').then((d) => setTxns(d.transactions ?? []));
  }, []);

  return (
    <NexusPage>
      <NexusHeader eyebrow="Finance" title="Transaction ledger" description="Platform-wide wallet and purchase audit trail." />
      <GlassPanel>
        <NexusTable>
          <thead><tr><th>When</th><th>Type</th><th>Amount</th><th>Status</th><th>Ref</th></tr></thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id}>
                <td className="text-xs">{new Date(t.created_at).toLocaleString()}</td>
                <td>{t.type}</td>
                <td className={`font-bold tabular-nums ${t.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  GH₵ {Number(t.amount).toFixed(2)}
                </td>
                <td><NexusPill tone={t.status === 'completed' ? 'success' : 'warn'}>{t.status}</NexusPill></td>
                <td className="font-mono text-xs">{t.reference}</td>
              </tr>
            ))}
          </tbody>
        </NexusTable>
      </GlassPanel>
    </NexusPage>
  );
}
