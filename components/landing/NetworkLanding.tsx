import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldCheck, Zap, Infinity as InfinityIcon, MessageCircle, Check } from 'lucide-react';
import { SITE } from '@/lib/brand';
import { LANDING_SIZES, priceFor, type NetworkLanding as NetworkLandingData } from '@/lib/networks';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/JsonLd';

function OfferCatalogJsonLd({ data }: { data: NetworkLandingData }) {
  const itemListElement = LANDING_SIZES.map((gb) => ({
    '@type': 'Offer',
    name: `${gb}GB ${data.network} Non-Expiry Data Bundle`,
    priceCurrency: 'GHS',
    price: priceFor(gb),
    availability: 'https://schema.org/InStock',
    url: `${SITE.url}/${data.slug}`,
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: `${data.network} Data Bundles`,
          description: data.description,
          brand: { '@type': 'Brand', name: data.network },
          category: 'Mobile Data Bundle',
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'GHS',
            lowPrice: priceFor(Math.min(...LANDING_SIZES)),
            highPrice: priceFor(Math.max(...LANDING_SIZES)),
            offerCount: LANDING_SIZES.length,
            offers: itemListElement,
            seller: { '@id': `${SITE.url}/#organization` },
          },
        }),
      }}
    />
  );
}

export function NetworkLanding({ data }: { data: NetworkLandingData }) {
  return (
    <div className="bg-[#f5f5f5]">
      <OfferCatalogJsonLd data={data} />
      <FaqJsonLd faqs={data.faqs} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: `${data.network} Data Bundles`, path: `/${data.slug}` },
        ]}
      />

      {/* Hero */}
      <section
        className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
        style={{
          background: `
            radial-gradient(ellipse 55% 70% at 100% 0%, ${data.accent}22, transparent 60%),
            radial-gradient(ellipse 60% 80% at 0% 0%, rgba(212,175,55,0.12), transparent 60%),
            linear-gradient(135deg, #081F3F 0%, #0A2E5D 100%)
          `,
        }}
      >
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-slate-300">
              <Link href="/" className="hover:text-gold-glow">Home</Link>
              <span className="mx-2 text-slate-500">/</span>
              <span className="text-gold-glow">{data.network} Data</span>
            </nav>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-glow">
              {data.network} {data.aka ? `· ${data.aka}` : ''} · Ghana
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {data.h1}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base lg:mx-0">
              {data.intro}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                href="/#shop-bundles"
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white gradient-accent shadow-lg shadow-gold/30 sm:w-auto"
              >
                Buy {data.network} data now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15 sm:w-auto"
              >
                <MessageCircle className="h-4 w-4 text-gold-glow" />
                Need help?
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/40 lg:max-w-none">
            <Image
              src={data.image}
              alt={`Buy ${data.network} data bundles in Ghana with instant delivery`}
              width={1024}
              height={683}
              priority
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: InfinityIcon, label: 'Non-expiry' },
            { icon: Zap, label: 'Instant delivery' },
            { icon: ShieldCheck, label: 'Secure MoMo' },
            { icon: Check, label: 'From 1GB–100GB' },
          ].map((item) => (
            <div key={item.label} className="card-elevated flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent text-white">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-[#111]">{item.label}</span>
            </div>
          ))}
        </div>

        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
          {data.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-slate-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
              {h}
            </li>
          ))}
        </ul>
      </section>

      {/* Pricing table */}
      <section className="mx-auto max-w-3xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="card-elevated overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="display-2 text-royal">{data.network} data bundle prices</h2>
            <p className="mt-1 text-sm text-muted">
              GH₵ {priceFor(1)} per GB · non-expiry · instant delivery in Ghana.
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 font-bold">{data.network} Bundle</th>
                <th className="px-5 py-3 font-bold">Price (GH₵)</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {LANDING_SIZES.map((gb) => (
                <tr key={gb} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-bold text-[#111]">{gb}GB</td>
                  <td className="px-5 py-3 tabular-nums text-slate-600">GH₵ {priceFor(gb)}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href="/#shop-bundles"
                      className="inline-flex items-center gap-1 text-xs font-bold text-gold-dark hover:text-royal"
                    >
                      Buy <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="display-2 text-center text-royal">{data.network} data — FAQ</h2>
        <div className="mt-6 space-y-3">
          {data.faqs.map((faq) => (
            <div key={faq.q} className="card-elevated p-5">
              <h3 className="text-sm font-bold text-royal sm:text-base">{faq.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#081F3F] to-[#0A2E5D] p-8 text-center">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">
            Ready to buy {data.network} data?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            Non-expiry bundles, delivered in minutes. Pay with Mobile Money.
          </p>
          <Link
            href="/#shop-bundles"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white gradient-accent shadow-lg shadow-gold/30"
          >
            Browse {data.network} bundles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
