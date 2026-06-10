'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusPill, NexusTable } from '@/components/admin/fds-ui';

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<any[]>([]);

  const load = () => adminFetch('/api/admin/disputes').then((d) => setDisputes(d.disputes ?? []));

  useEffect(() => {
    load();
  }, []);

  const resolve = async (id: string, status: string) => {
    await adminFetch('/api/admin/disputes', {
      method: 'POST',
      body: JSON.stringify({ disputeId: id, status, resolution: 'Resolved by admin' }),
    });
    load();
  };

  return (
    <NexusPage>
      <NexusHeader eyebrow="Support" title="Disputes" description="Customer disputes linked to orders — resolve or reject." />
      <GlassPanel glow="rose">
        <NexusTable>
          <thead><tr><th>Opened</th><th>Reason</th><th>Status</th><th /></tr></thead>
          <tbody>
            {disputes.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-emerald-300">No disputes — great job.</td></tr>
            ) : (
              disputes.map((d) => (
                <tr key={d.id}>
                  <td className="text-xs">{new Date(d.created_at).toLocaleString()}</td>
                  <td>{d.reason}</td>
                  <td><NexusPill tone={d.status === 'open' ? 'warn' : 'success'}>{d.status}</NexusPill></td>
                  <td>
                    {d.status === 'open' && (
                      <div className="flex gap-2">
                        <NexusBtn variant="gold" className="text-xs" onClick={() => resolve(d.id, 'resolved')}>Resolve</NexusBtn>
                        <NexusBtn variant="danger" className="text-xs" onClick={() => resolve(d.id, 'rejected')}>Reject</NexusBtn>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </NexusTable>
      </GlassPanel>
    </NexusPage>
  );
}
