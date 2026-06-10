'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { getPricePerGb, updatePricePerGb, getReferralsEnabled, setReferralsEnabled } from '@/services/supabaseDatabase';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage } from '@/components/admin/fds-ui';

export default function AdminSettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [price, setPrice] = useState(0);
  const [referrals, setReferrals] = useState(false);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    adminFetch('/api/admin/platform-config').then((d) => setConfig(d.config));
    getPricePerGb().then(setPrice);
    getReferralsEnabled().then(setReferrals);
  }, []);

  const saveConfig = async () => {
    await adminFetch('/api/admin/platform-config', { method: 'PATCH', body: JSON.stringify(config) });
    setSaved('Platform config saved');
  };

  const savePrice = async () => {
    await updatePricePerGb(price);
    setSaved('Price updated');
  };

  if (!config) return <p className="text-white/50">Loading settings…</p>;

  return (
    <NexusPage>
      <NexusHeader eyebrow="Platform" title="Settings & config" description="Hot-switch routing, SMS, referrals, and pricing without redeploy." />
      {saved && <p className="text-sm text-emerald-300">{saved}</p>}

      <GlassPanel glow="gold">
        <h3 className="font-bold text-white">Pricing</h3>
        <div className="mt-3 flex gap-2">
          <input type="number" className="fds-input max-w-xs" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          <NexusBtn variant="gold" onClick={savePrice}>Save price/GB</NexusBtn>
        </div>
      </GlassPanel>

      <GlassPanel>
        <h3 className="font-bold text-white">Moolre SMS</h3>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={config.moolreSms.enabled} onChange={(e) => setConfig({ ...config, moolreSms: { ...config.moolreSms, enabled: e.target.checked } })} />
          SMS notifications enabled
        </label>
        <label className="mt-2 block text-xs text-white/50">Sender ID (max 11)</label>
        <input className="fds-input mt-1 max-w-xs" value={config.moolreSms.senderId} onChange={(e) => setConfig({ ...config, moolreSms: { ...config.moolreSms, senderId: e.target.value } })} />
      </GlassPanel>

      <GlassPanel>
        <h3 className="font-bold text-white">SMS templates</h3>
        <label className="mt-2 block text-xs text-white/50">Payment received (customer)</label>
        <textarea className="fds-input mt-1 min-h-[80px]" value={config.smsTemplates.paymentReceived} onChange={(e) => setConfig({ ...config, smsTemplates: { ...config.smsTemplates, paymentReceived: e.target.value } })} />
        <label className="mt-2 block text-xs text-white/50">Order fulfilled (customer)</label>
        <textarea className="fds-input mt-1 min-h-[80px]" value={config.smsTemplates.orderFulfilled} onChange={(e) => setConfig({ ...config, smsTemplates: { ...config.smsTemplates, orderFulfilled: e.target.value } })} />
        <label className="mt-2 block text-xs text-white/50">Wallet top-up (admin alert)</label>
        <textarea className="fds-input mt-1 min-h-[80px]" value={config.smsTemplates.walletTopUpAdmin} onChange={(e) => setConfig({ ...config, smsTemplates: { ...config.smsTemplates, walletTopUpAdmin: e.target.value } })} />
      </GlassPanel>

      <GlassPanel>
        <h3 className="font-bold text-white">Referrals & cooldown</h3>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={referrals} onChange={() => setReferralsEnabled(!referrals).then(() => setReferrals(!referrals))} />
          Referrals program enabled
        </label>
        <label className="mt-3 block text-xs text-white/50">Referral reward (GHS)</label>
        <input type="number" className="fds-input mt-1 max-w-xs" value={config.referralRewardGhs} onChange={(e) => setConfig({ ...config, referralRewardGhs: Number(e.target.value) })} />
        <label className="mt-3 block text-xs text-white/50">Order cooldown (minutes)</label>
        <input type="number" className="fds-input mt-1 max-w-xs" value={config.recipientOrderCooldownMinutes} onChange={(e) => setConfig({ ...config, recipientOrderCooldownMinutes: Number(e.target.value) })} />
      </GlassPanel>

      <GlassPanel>
        <h3 className="font-bold text-white">Contact</h3>
        <input className="fds-input mt-2" placeholder="Support WhatsApp" value={config.contact.supportWhatsApp} onChange={(e) => setConfig({ ...config, contact: { ...config.contact, supportWhatsApp: e.target.value } })} />
      </GlassPanel>

      <NexusBtn variant="gold" onClick={saveConfig}>Save platform config</NexusBtn>
    </NexusPage>
  );
}
