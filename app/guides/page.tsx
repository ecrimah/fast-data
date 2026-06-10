import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { SITE } from '@/lib/brand';
import { GUIDES } from '@/lib/guides';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { PageHero } from '@/components/layout/PageHero';

export const metadata: Metadata = {
  title: 'Data Bundle Guides & Tips for Ghana',
  description:
    'Helpful guides on buying MTN, Telecel and AT data bundles in Ghana — how to buy data, pay with MoMo, save money, and understand non-expiry data.',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: `Data Bundle Guides | ${SITE.name}`,
    description: 'Learn how to buy, pay for, and save on data bundles in Ghana.',
    url: `${SITE.url}/guides`,
    images: [SITE.ogImage],
  },
};

export default function GuidesPage() {
  return (
    <div className="bg-[#f5f5f5]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
        ]}
      />

      <PageHero
        image={SITE.heroGuides}
        alt="Data bundle guides and tips for Ghana"
        eyebrow="Guides & tips"
        title="Data bundle guides for Ghana"
        description="Everything you need to buy smarter — from MoMo payments to saving money with non-expiry data."
      />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-5 sm:grid-cols-2">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="card-elevated card-lift group flex flex-col p-6"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-dark">
                {guide.category}
              </span>
              <h2 className="mt-2 text-lg font-extrabold text-royal group-hover:text-gold-dark">
                {guide.h1}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{guide.excerpt}</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {guide.readMinutes} min read
                </span>
                <span className="inline-flex items-center gap-1 font-bold text-royal group-hover:text-gold-dark">
                  Read guide <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
