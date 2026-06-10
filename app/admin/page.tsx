'use client';

import { useEffect, useState } from 'react';
import { DollarSign, Package, Zap, Radio, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api/admin-client';
import { formatGHS } from '@/lib/admin-metrics';
import { CircleProgress } from '@/components/admin/CircleProgress';
import { GlassPanel, NexusHeader, NexusPage, StatOrb } from '@/components/admin/fds-ui';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      adminFetch('/api/admin/analytics'),
      adminFetch('/api/admin/notifications'),
      adminFetch('/api/admin/orders?filter=pending_delivery'),
    ]).then(([analytics, notifications, orders]) => {
      setData({ analytics, queue: orders.orders?.slice(0, 5) ?? [] });
      setAlerts(notifications);
    }).catch(console.error);
  }, []);

  const metrics = data?.analytics?.metrics;

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Command center"
        title="Platform pulse"
        description="Revenue, fulfilment health, and live ops queue — all in one view."
        actions={
          <Link href="/admin/operations" className="fds-btn fds-btn-gold inline-flex items-center gap-1">
            Open queue <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {alerts && alerts.total > 0 && (
        <GlassPanel glow="rose" className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-rose-200">{alerts.total} items need attention</p>
          <p className="text-xs text-white/50">
            {alerts.pendingDelivery} delivery · {alerts.awaitingManual} manual · {alerts.failedSupplier} supplier ·{' '}
            {alerts.unmatchedPayments} unmatched MoMo
          </p>
        </GlassPanel>
      )}

      <div className="fds-vault-hero">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="fds-eyebrow">Platform vault · 30 days</p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums text-white sm:text-4xl">
              {metrics ? formatGHS(metrics.gmv30d) : '—'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="fds-pill fds-pill-success">
                <Zap className="mr-1 inline h-3 w-3" />
                {metrics ? `${metrics.paymentSuccessRate.toFixed(0)}% paid` : '—'}
              </span>
              <span className="fds-pill fds-pill-info">
                {metrics ? `${metrics.fulfillmentRate.toFixed(0)}% fulfilled` : '—'}
              </span>
            </div>
          </div>
          {metrics && (
            <CircleProgress
              value={metrics.fulfillmentRate}
              label={`${Math.round(metrics.fulfillmentRate)}%`}
              caption="FULFILLED"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatOrb tone="gold" label="GMV (30d)" value={metrics ? formatGHS(metrics.gmv30d) : '—'} />
        <StatOrb tone="sky" label="Orders today" value={metrics ? String(metrics.ordersToday) : '—'} />
        <StatOrb tone="rose" label="Pending delivery" value={metrics ? String(metrics.pendingDelivery) : '—'} />
        <StatOrb tone="violet" label="Total orders" value={metrics ? String(metrics.ordersTotal) : '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-bold text-white">Reconciliation queue</h3>
            <Link href="/admin/operations" className="text-xs font-bold text-gold-glow hover:underline">
              View all
            </Link>
          </div>
          {!data?.queue?.length ? (
            <p className="text-sm text-white/40">Queue is clear.</p>
          ) : (
            <ul className="space-y-2">
              {data.queue.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs">
                  <span className="font-mono text-gold-glow">{o.payment_ref}</span>
                  <span>{o.network} · {o.bundle_size}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>

        <GlassPanel>
          <h3 className="mb-3 font-bold text-white">Quick links</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/admin/suppliers', icon: Radio, label: 'Supplier console' },
              { href: '/admin/momo', icon: DollarSign, label: 'MoMo matching' },
              { href: '/admin/sms', icon: Package, label: 'SMS hub' },
              { href: '/admin/settings', icon: Zap, label: 'Platform config' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-3 text-xs font-semibold text-white/80 hover:border-gold/30 hover:bg-gold/5"
              >
                <item.icon className="h-4 w-4 text-gold-glow" />
                {item.label}
              </Link>
            ))}
          </div>
        </GlassPanel>
      </div>
    </NexusPage>
  );
}
