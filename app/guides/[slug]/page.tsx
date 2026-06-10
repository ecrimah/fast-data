import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { SITE } from '@/lib/brand';
import { GUIDES, getGuide } from '@/lib/guides';
import { BreadcrumbJsonLd, FaqJsonLd } from '@/components/seo/JsonLd';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: 'article',
      title: guide.title,
      description: guide.description,
      url: `${SITE.url}/guides/${guide.slug}`,
      images: [SITE.ogImage],
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
    },
  };
}

function ArticleJsonLd({ slug }: { slug: string }) {
  const guide = getGuide(slug);
  if (!guide) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: guide.h1,
          description: guide.description,
          image: `${SITE.url}${SITE.ogImage}`,
          datePublished: guide.datePublished,
          dateModified: guide.dateModified,
          inLanguage: 'en-GH',
          mainEntityOfPage: `${SITE.url}/guides/${guide.slug}`,
          author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
          publisher: {
            '@type': 'Organization',
            name: SITE.name,
            logo: { '@type': 'ImageObject', url: `${SITE.url}${SITE.logo}` },
          },
        }),
      }}
    />
  );
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 2);

  return (
    <div className="bg-[#f5f5f5]">
      <ArticleJsonLd slug={guide.slug} />
      {guide.faqs && guide.faqs.length > 0 && <FaqJsonLd faqs={guide.faqs} />}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Guides', path: '/guides' },
          { name: guide.h1, path: `/guides/${guide.slug}` },
        ]}
      />

      <section
        className="px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
        style={{
          background: `
            radial-gradient(ellipse 60% 80% at 0% 0%, rgba(212,175,55,0.12), transparent 60%),
            linear-gradient(135deg, #081F3F 0%, #0A2E5D 100%)
          `,
        }}
      >
        <div className="mx-auto max-w-3xl">
          <Link href="/guides" className="inline-flex items-center gap-1 text-xs font-semibold text-gold-glow hover:underline">
            <ArrowLeft className="h-3 w-3" /> All guides
          </Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-gold-glow/80">
            {guide.category}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {guide.h1}
          </h1>
          <p className="mt-3 flex items-center gap-2 text-xs text-slate-300">
            <Clock className="h-3 w-3" /> {guide.readMinutes} min read · Updated{' '}
            {new Date(guide.dateModified).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <p className="text-base leading-relaxed text-slate-700">{guide.description}</p>

        {guide.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-xl font-extrabold text-royal">{section.heading}</h2>
            {section.body.map((para, i) => (
              <p key={i} className="mt-3 text-sm leading-relaxed text-slate-600">
                {para}
              </p>
            ))}
          </section>
        ))}

        {guide.faqs && guide.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-extrabold text-royal">FAQ</h2>
            <div className="mt-4 space-y-3">
              {guide.faqs.map((faq) => (
                <div key={faq.q} className="card-elevated p-5">
                  <h3 className="text-sm font-bold text-royal">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#081F3F] to-[#0A2E5D] p-8 text-center">
          <h2 className="text-xl font-extrabold text-white">Buy your data in minutes</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            Non-expiry MTN, Telecel &amp; AT bundles. Pay with MoMo, delivered instantly.
          </p>
          <Link
            href="/#shop-bundles"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white gradient-accent shadow-lg shadow-gold/30"
          >
            Browse bundles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-extrabold text-royal">Related guides</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.map((g) => (
                <Link key={g.slug} href={`/guides/${g.slug}`} className="card-elevated card-lift p-5">
                  <h3 className="text-sm font-bold text-royal">{g.h1}</h3>
                  <p className="mt-1 text-xs text-muted">{g.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}
