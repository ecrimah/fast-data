'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { formatGHS } from '@/lib/admin-metrics';
import { GlassPanel, NexusHeader, NexusPage, StatOrb } from '@/components/admin/fds-ui';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    adminFetch('/api/admin/analytics').then(setData);
  }, []);

  const m = data?.metrics;

  return (
    <NexusPage>
      <NexusHeader eyebrow="Insights" title="Analytics" description="Fulfilment trends, network mix, and payment methods." />
      {m && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatOrb tone="gold" label="GMV 30d" value={formatGHS(m.gmv30d)} />
            <StatOrb tone="emerald" label="Fulfillment" value={`${m.fulfillmentRate.toFixed(0)}%`} />
            <StatOrb tone="sky" label="MoMo share" value={`${m.moolreShare.toFixed(0)}%`} />
            <StatOrb tone="violet" label="Wallet share" value={`${m.walletShare.toFixed(0)}%`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <GlassPanel>
              <h3 className="mb-3 font-bold text-white">By network (30d)</h3>
              {Object.entries(data.byNetwork ?? {}).map(([net, count]) => (
                <div key={net} className="flex justify-between border-b border-white/5 py-2 text-sm">
                  <span>{net}</span>
                  <span className="font-bold text-gold-glow">{String(count)} orders</span>
                </div>
              ))}
            </GlassPanel>
            <GlassPanel>
              <h3 className="mb-3 font-bold text-white">By payment method</h3>
              {Object.entries(data.byMethod ?? {}).map(([method, count]) => (
                <div key={method} className="flex justify-between border-b border-white/5 py-2 text-sm">
                  <span>{method}</span>
                  <span className="font-bold">{String(count)}</span>
                </div>
              ))}
            </GlassPanel>
          </div>
        </>
      )}
    </NexusPage>
  );
}
