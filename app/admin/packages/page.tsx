'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminFetch } from '@/lib/api/admin-client';
import { GlassPanel, NexusBtn, NexusHeader, NexusPage, NexusPill, StatOrb } from '@/components/admin/fds-ui';
import { PACKAGE_NETWORKS, type DataPackage, type PackageNetwork } from '@/lib/packages/types';
import { Plus, Trash2, Star, Wand2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const STANDARD_SIZES = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20, 25, 30, 40, 50, 100];

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<DataPackage[]>([]);
  const [network, setNetwork] = useState<PackageNetwork>('MTN');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [form, setForm] = useState({ size_gb: '', price: '', label: '', popular: false });
  const [bulkPrice, setBulkPrice] = useState('6');

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminFetch('/api/admin/packages');
      setPackages(d.packages ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (m: string) => {
    setMsg(m);
    setErr('');
    setTimeout(() => setMsg(''), 3500);
  };
  const fail = (e: unknown) => setErr(e instanceof Error ? e.message : 'Action failed');

  const rows = useMemo(
    () => packages.filter((p) => p.network === network).sort((a, b) => a.sort_order - b.sort_order || a.size_gb - b.size_gb),
    [packages, network]
  );

  const networkCount = (n: PackageNetwork) => packages.filter((p) => p.network === n && p.active).length;

  const updateLocal = (id: string, patch: Partial<DataPackage>) =>
    setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const saveRow = async (pkg: DataPackage) => {
    setBusy(true);
    try {
      await adminFetch('/api/admin/packages', {
        method: 'PATCH',
        body: JSON.stringify({
          id: pkg.id,
          price: pkg.price,
          size_gb: pkg.size_gb,
          label: pkg.label,
          active: pkg.active,
          popular: pkg.popular,
          sort_order: pkg.sort_order,
        }),
      });
      flash(`Saved ${pkg.size_gb}GB ${pkg.network}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (pkg: DataPackage, field: 'active' | 'popular') => {
    const next = !pkg[field];
    updateLocal(pkg.id, { [field]: next } as Partial<DataPackage>);
    try {
      await adminFetch('/api/admin/packages', {
        method: 'PATCH',
        body: JSON.stringify({ id: pkg.id, [field]: next }),
      });
    } catch (e) {
      updateLocal(pkg.id, { [field]: pkg[field] } as Partial<DataPackage>);
      fail(e);
    }
  };

  const removeRow = async (pkg: DataPackage) => {
    if (!confirm(`Delete ${pkg.size_gb}GB ${pkg.network} package?`)) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/packages?id=${pkg.id}`, { method: 'DELETE' });
      setPackages((prev) => prev.filter((p) => p.id !== pkg.id));
      flash('Package deleted');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const addPackage = async () => {
    const size = Number(form.size_gb);
    const price = Number(form.price);
    if (!size || size <= 0 || !price || price < 0) {
      setErr('Enter a valid size and price');
      return;
    }
    setBusy(true);
    try {
      await adminFetch('/api/admin/packages', {
        method: 'POST',
        body: JSON.stringify({
          network,
          size_gb: size,
          price,
          label: form.label,
          popular: form.popular,
          sort_order: rows.length + 1,
        }),
      });
      setForm({ size_gb: '', price: '', label: '', popular: false });
      flash('Package added');
      load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const bulkGenerate = async () => {
    const rate = Number(bulkPrice);
    if (!rate || rate <= 0) {
      setErr('Enter a valid price per GB');
      return;
    }
    if (!confirm(`Generate/refresh standard ${network} packages at GH₵${rate}/GB? Existing sizes will be repriced.`)) return;
    setBusy(true);
    try {
      const d = await adminFetch('/api/admin/packages', {
        method: 'POST',
        body: JSON.stringify({ bulk: true, network, pricePerGb: rate, sizes: STANDARD_SIZES }),
      });
      flash(`Generated ${d.count} ${network} packages`);
      load();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <NexusPage>
      <NexusHeader
        eyebrow="Catalog"
        title="Data packages"
        description="Create and price bundles per network. Changes go live on the storefront instantly — no redeploy."
      />
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {err && <p className="text-sm text-rose-300">{err}</p>}

      <div className="grid grid-cols-3 gap-3">
        {PACKAGE_NETWORKS.map((n) => (
          <StatOrb
            key={n}
            tone={n === 'MTN' ? 'gold' : n === 'Telecel' ? 'rose' : 'sky'}
            label={`${n} active`}
            value={String(networkCount(n))}
            hint="live packages"
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PACKAGE_NETWORKS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNetwork(n)}
            className={cn(
              'rounded-xl border px-4 py-2 text-sm font-bold transition-all',
              network === n
                ? 'border-gold/40 bg-gold/15 text-gold-glow'
                : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <GlassPanel glow="gold">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Bulk generator</label>
            <p className="mt-1 text-xs text-white/50">Reprice all standard {network} sizes at one rate.</p>
          </div>
          <div className="flex items-end gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">GH₵ / GB</label>
              <input
                type="number"
                className="fds-input mt-1 w-28"
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
              />
            </div>
            <NexusBtn variant="gold" onClick={bulkGenerate} disabled={busy}>
              <Wand2 className="mr-1 inline h-4 w-4" /> Generate {network}
            </NexusBtn>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <h3 className="font-bold text-white">Add {network} package</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <input
            type="number"
            className="fds-input"
            placeholder="Size (GB)"
            value={form.size_gb}
            onChange={(e) => setForm({ ...form, size_gb: e.target.value })}
          />
          <input
            type="number"
            className="fds-input"
            placeholder="Price (GH₵)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <input
            className="fds-input md:col-span-2"
            placeholder="Label (optional, e.g. 5GB Weekend)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
          />
          <NexusBtn variant="gold" onClick={addPackage} disabled={busy}>
            <Plus className="mr-1 inline h-4 w-4" /> Add
          </NexusBtn>
        </div>
      </GlassPanel>

      <GlassPanel>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-white/50">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading packages…
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/40">No {network} packages yet — add one or use the generator.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((pkg) => (
              <div
                key={pkg.id}
                className={cn(
                  'grid grid-cols-2 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-12',
                  !pkg.active && 'opacity-50'
                )}
              >
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Size GB</label>
                  <input
                    type="number"
                    className="fds-input mt-1"
                    value={pkg.size_gb}
                    onChange={(e) => updateLocal(pkg.id, { size_gb: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Price GH₵</label>
                  <input
                    type="number"
                    className="fds-input mt-1"
                    value={pkg.price}
                    onChange={(e) => updateLocal(pkg.id, { price: Number(e.target.value) })}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Label</label>
                  <input
                    className="fds-input mt-1"
                    placeholder={`${pkg.size_gb} GB`}
                    value={pkg.label ?? ''}
                    onChange={(e) => updateLocal(pkg.id, { label: e.target.value })}
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Order</label>
                  <input
                    type="number"
                    className="fds-input mt-1"
                    value={pkg.sort_order}
                    onChange={(e) => updateLocal(pkg.id, { sort_order: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => toggle(pkg, 'popular')}
                    className={cn(
                      'flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-bold',
                      pkg.popular
                        ? 'border-gold/40 bg-gold/15 text-gold-glow'
                        : 'border-white/10 bg-white/5 text-white/50'
                    )}
                  >
                    <Star className={cn('h-3 w-3', pkg.popular && 'fill-current')} /> Popular
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(pkg, 'active')}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5"
                  >
                    <NexusPill tone={pkg.active ? 'success' : 'neutral'}>{pkg.active ? 'Live' : 'Off'}</NexusPill>
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2 md:col-span-2">
                  <NexusBtn variant="gold" className="text-xs" onClick={() => saveRow(pkg)} disabled={busy}>
                    Save
                  </NexusBtn>
                  <NexusBtn variant="danger" className="text-xs" onClick={() => removeRow(pkg)} disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </NexusBtn>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </NexusPage>
  );
}
