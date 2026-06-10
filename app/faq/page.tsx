import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SITE } from '@/lib/brand';
import { FAQS } from '@/lib/faqs';
import { FaqJsonLd, BreadcrumbJsonLd } from '@/components/seo/JsonLd';
import { PageHero } from '@/components/layout/PageHero';

export const metadata: Metadata = {
  title: 'Data Bundle FAQ — Delivery, Payment & Networks',
  description:
    'Frequently asked questions about buying MTN, Telecel and AT data bundles in Ghana — delivery time, non-expiry data, Mobile Money payment, and order tracking.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: `Data Bundle FAQ | ${SITE.name}`,
    description:
      'Answers about delivery time, non-expiry data, MoMo payment, and tracking your data bundle order in Ghana.',
    url: `${SITE.url}/faq`,
    images: [SITE.ogImage],
  },
};

export default function FaqPage() {
  return (
    <div className="bg-[#f5f5f5]">
      <FaqJsonLd faqs={FAQS} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'FAQ', path: '/faq' },
        ]}
      />

      <PageHero
        image={SITE.heroFaq}
        alt="Fast Data Services help center and FAQ"
        eyebrow="Help center"
        title="Frequently asked questions"
        description={`Everything you need to know about buying data bundles in Ghana with ${SITE.name}.`}
      />

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <article key={faq.q} className="card-elevated p-5">
              <h2 className="text-sm font-bold text-royal sm:text-base">{faq.q}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#081F3F] to-[#0A2E5D] p-8 text-center">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">Still have a question?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            Chat with us on WhatsApp or ask Tay, our AI assistant — we&apos;re here to help.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white gradient-accent shadow-lg shadow-gold/30"
            >
              Contact support
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#shop-bundles"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
            >
              Browse bundles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
