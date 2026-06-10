'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusHeader, NexusPage, NexusPill, NexusTable } from '@/components/admin/fds-ui';

export default function AdminReferralsPage() {
  const [rewards, setRewards] = useState<any[]>([]);

  useEffect(() => {
    adminFetch('/api/admin/referrals').then((d) => setRewards(d.rewards ?? []));
  }, []);

  return (
    <NexusPage>
      <NexusHeader eyebrow="Growth" title="Referrals program" description="Track referral rewards credited to user wallets." />
      <GlassPanel>
        <NexusTable>
          <thead><tr><th>When</th><th>Referrer</th><th>Referred</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {rewards.length === 0 ? (
              <tr><td colSpan={5} className="py-8 text-center text-white/40">No referral rewards yet.</td></tr>
            ) : (
              rewards.map((r) => (
                <tr key={r.id}>
                  <td className="text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="font-mono text-xs">{r.referrer_id?.slice(0, 8)}</td>
                  <td className="font-mono text-xs">{r.referred_id?.slice(0, 8)}</td>
                  <td className="font-bold tabular-nums">GH₵ {Number(r.amount).toFixed(2)}</td>
                  <td><NexusPill tone={r.status === 'credited' ? 'success' : 'warn'}>{r.status}</NexusPill></td>
                </tr>
              ))
            )}
          </tbody>
        </NexusTable>
      </GlassPanel>
    </NexusPage>
  );
}
