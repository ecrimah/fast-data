'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { DEFAULT_SHOP_BANNERS, type ShopBanner } from '@/lib/platform/config-types';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusPill, NexusTable } from '@/components/admin/fds-ui';

function newBanner(): ShopBanner {
  return {
    id: `banner-${Date.now()}`,
    title: '',
    description: '',
    active: true,
  };
}

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [banners, setBanners] = useState<ShopBanner[]>([]);
  const [form, setForm] = useState({ code: '', title: '', discount_percent: 10, active: true });
  const [saved, setSaved] = useState('');

  const loadPromos = () => adminFetch('/api/admin/promotions').then((d) => setPromos(d.promotions ?? []));

  const loadBanners = () =>
    adminFetch('/api/admin/platform-config').then((d) => {
      setBanners(d.config?.shopBanners?.length ? d.config.shopBanners : DEFAULT_SHOP_BANNERS);
    });

  useEffect(() => {
    loadPromos();
    loadBanners();
  }, []);

  const createPromo = async () => {
    await adminFetch('/api/admin/promotions', { method: 'POST', body: JSON.stringify(form) });
    setForm({ code: '', title: '', discount_percent: 10, active: true });
    loadPromos();
  };

  const saveBanners = async () => {
    const { config } = await adminFetch('/api/admin/platform-config');
    await adminFetch('/api/admin/platform-config', {
      method: 'PATCH',
      body: JSON.stringify({ ...config, shopBanners: banners }),
    });
    setSaved('Shop promo cards saved — visible on homepage immediately.');
    setTimeout(() => setSaved(''), 4000);
  };

  const updateBanner = (id: string, patch: Partial<ShopBanner>) => {
    setBanners((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBanner = (id: string) => {
    setBanners((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Growth"
        title="Promotions"
        description="Control homepage promo cards and checkout promo codes — no redeploy needed."
      />
      {saved && <p className="text-sm text-emerald-300">{saved}</p>}

      <GlassPanel glow="gold">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white">Shop promo cards</h3>
            <p className="mt-1 text-xs text-white/50">
              These appear on the homepage above bundle selection — like &quot;New Here?&quot; banners.
            </p>
          </div>
          <div className="flex gap-2">
            <NexusBtn variant="ghost" onClick={() => setBanners((prev) => [...prev, newBanner()])}>
              Add card
            </NexusBtn>
            <NexusBtn variant="gold" onClick={saveBanners}>
              Save cards
            </NexusBtn>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Title</label>
                  <input
                    className="fds-input mt-1"
                    value={banner.title}
                    onChange={(e) => updateBanner(banner.id, { title: e.target.value })}
                    placeholder="New Here?"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Description</label>
                  <input
                    className="fds-input mt-1"
                    value={banner.description}
                    onChange={(e) => updateBanner(banner.id, { description: e.target.value })}
                    placeholder="Use code FDS500 for free 500MB on your first order."
                  />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm text-white/70">
                  <input
                    type="checkbox"
                    checked={banner.active}
                    onChange={(e) => updateBanner(banner.id, { active: e.target.checked })}
                  />
                  Show on shop
                </label>
                <NexusBtn variant="danger" className="text-xs" onClick={() => removeBanner(banner.id)}>
                  Remove
                </NexusBtn>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <p className="py-6 text-center text-sm text-white/40">No promo cards — add one to show on the homepage.</p>
          )}
        </div>
      </GlassPanel>

      <GlassPanel>
        <h3 className="font-bold text-white">Checkout promo codes</h3>
        <p className="mt-1 text-xs text-white/50">Discount codes applied at checkout and Tay AI orders.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input className="fds-input" placeholder="CODE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <input className="fds-input" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input type="number" className="fds-input" placeholder="% off" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: Number(e.target.value) })} />
          <NexusBtn variant="gold" onClick={createPromo}>Create code</NexusBtn>
        </div>
      </GlassPanel>

      <GlassPanel>
        <NexusTable>
          <thead><tr><th>Code</th><th>Title</th><th>Discount</th><th>Status</th></tr></thead>
          <tbody>
            {promos.length === 0 ? (
              <tr><td colSpan={4} className="py-8 text-center text-white/40">No promo codes yet.</td></tr>
            ) : (
              promos.map((p) => (
                <tr key={p.id}>
                  <td className="font-bold text-gold-glow">{p.code}</td>
                  <td>{p.title}</td>
                  <td>{p.discount_percent ? `${p.discount_percent}%` : `GH₵ ${p.discount_amount}`}</td>
                  <td><NexusPill tone={p.active ? 'success' : 'neutral'}>{p.active ? 'Active' : 'Off'}</NexusPill></td>
                </tr>
              ))
            )}
          </tbody>
        </NexusTable>
      </GlassPanel>
    </NexusPage>
  );
}
