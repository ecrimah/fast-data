'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Bundle } from '../types';
import { AVAILABLE_NETWORKS, PRICE_PER_GB, BUNDLE_SIZES } from '../constants';
import { getPricePerGb } from '../services/supabaseDatabase';
import { setCheckoutState } from '@/lib/navigationState';
import { DEFAULT_SHOP_BANNERS, type ShopBanner } from '@/lib/platform/config-types';
import type { DataPackage, PackageNetwork } from '@/lib/packages/types';
import { ArrowRight, Loader2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const networkSlug = (n: Network) => {
  if (n === Network.MTN) return 'mtn';
  if (n === Network.VODAFONE) return 'telecel';
  return 'at';
};

function toPackageNetwork(n: Network): PackageNetwork {
  if (n === Network.MTN) return 'MTN';
  if (n === Network.VODAFONE) return 'Telecel';
  return 'AT';
}

export const Shop: React.FC = () => {
  const router = useRouter();
  const [selectedNetwork, setSelectedNetwork] = useState<Network>(Network.MTN);
  const [currentPricePerGb, setCurrentPricePerGb] = useState<number>(PRICE_PER_GB);
  const [packagesByNetwork, setPackagesByNetwork] = useState<Record<PackageNetwork, DataPackage[]>>({
    MTN: [],
    Telecel: [],
    AT: [],
  });
  const [loadingPrice, setLoadingPrice] = useState(true);
  const [promoBanners, setPromoBanners] = useState<ShopBanner[]>(DEFAULT_SHOP_BANNERS);

  useEffect(() => {
    Promise.all([
      getPricePerGb(),
      fetch('/api/storefront/packages').then((r) => r.json()),
      fetch('/api/storefront/banners').then((r) => r.json()),
    ])
      .then(([price, pkgData, bannerData]) => {
        setCurrentPricePerGb(price);
        if (pkgData.packages) setPackagesByNetwork(pkgData.packages);
        if (bannerData.banners?.length) setPromoBanners(bannerData.banners);
      })
      .catch(() => {})
      .finally(() => setLoadingPrice(false));
  }, []);

  const activePackages = useMemo(() => {
    const net = toPackageNetwork(selectedNetwork);
    const fromDb = packagesByNetwork[net] ?? [];
    if (fromDb.length > 0) return fromDb;
    return BUNDLE_SIZES.map((size, i) => ({
      id: `fallback-${net}-${size}`,
      network: net,
      size_gb: size,
      price: size * currentPricePerGb,
      label: null,
      active: true,
      popular: size === 5 || size === 10,
      sort_order: i + 1,
    })) as DataPackage[];
  }, [packagesByNetwork, selectedNetwork, currentPricePerGb]);

  const handleBuyClick = (pkg: DataPackage) => {
    const bundle: Bundle = { size: pkg.size_gb, price: Number(pkg.price) };
    setCheckoutState({ bundle, network: selectedNetwork });
    router.push('/checkout');
  };

  const slug = networkSlug(selectedNetwork);

  return (
    <div id="shop-bundles" className="scroll-mt-24 space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="eyebrow text-gold-dark">Shop bundles</span>
          <h2 className="display-2 mt-2 text-royal">Choose your package</h2>
          <p className="mt-1 text-sm text-muted">
            Live prices · Non-expiry · Instant delivery
          </p>
        </div>
      </div>

      {promoBanners.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {promoBanners.map((promo) => (
            <div key={promo.id} className="vault-hero-card">
              <p className="eyebrow text-gold-glow">Promo</p>
              <h3 className="mt-2 text-xl font-extrabold">{promo.title}</h3>
              <p className="mt-2 text-sm text-slate-300">{promo.description}</p>
            </div>
          ))}
        </section>
      )}

      <div className="flex justify-center">
        <div className="inline-flex rounded-full border border-border bg-white p-1 shadow-sm">
          {AVAILABLE_NETWORKS.map((net) => (
            <button
              key={net.id}
              type="button"
              onClick={() => setSelectedNetwork(net.id as Network)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-bold transition-all',
                selectedNetwork === net.id ? 'gradient-accent shadow-md text-white' : 'text-muted hover:text-royal'
              )}
            >
              {net.name}
            </button>
          ))}
        </div>
      </div>

      {loadingPrice ? (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="animate-spin text-royal" size={40} />
          <p className="mt-3 text-sm text-muted">Loading live prices…</p>
        </div>
      ) : (
        <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {activePackages.map((pkg) => (
            <button
              key={pkg.id}
              type="button"
              onClick={() => handleBuyClick(pkg)}
              className={cn(
                'card-elevated card-lift group overflow-hidden p-0 text-left',
                pkg.popular && 'ring-2 ring-gold/40'
              )}
            >
              <div className={cn('h-1', slug === 'mtn' && 'bg-mtn', slug === 'telecel' && 'bg-telecel', slug === 'at' && 'bg-at')} />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Non-expiry</p>
                  {pkg.popular && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold-dark">
                      <Star className="h-2.5 w-2.5 fill-current" /> Popular
                    </span>
                  )}
                </div>
                <p className="mt-2 text-2xl font-extrabold tabular-nums text-royal">
                  {pkg.size_gb} <span className="text-sm font-semibold text-muted">GB</span>
                </p>
                {pkg.label && <p className="mt-0.5 text-[10px] font-semibold text-muted">{pkg.label}</p>}
                <p className="mt-1 text-sm font-bold text-gold-dark">GH₵ {Number(pkg.price).toFixed(2)}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-bold text-royal">
                  Buy now
                  <span className="inline-flex rounded-lg gradient-accent px-2 py-1 text-white shadow-sm">
                    <ArrowRight size={14} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </section>
      )}
    </div>
  );
};
