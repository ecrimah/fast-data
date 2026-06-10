import type { Metadata } from 'next';
import Link from 'next/link';
import { MessageCircle, Users, Bell, ShieldCheck, ArrowRight } from 'lucide-react';
import { SITE } from '@/lib/brand';
import { PageHero } from '@/components/layout/PageHero';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'WhatsApp Community',
  description: `Join the ${SITE.name} WhatsApp community for deals, bundle alerts, and support in Ghana.`,
  alternates: { canonical: '/community' },
};

const PERKS = [
  { icon: Bell, title: 'Flash deals', text: 'Be first to know when we drop bonus bundles or limited promos.' },
  { icon: Users, title: 'Real community', text: 'Connect with other data buyers across Ghana and share tips.' },
  { icon: ShieldCheck, title: 'Verified updates', text: 'Official announcements only — no spam, no scams.' },
];

export default function CommunityPage() {
  const communityUrl = SITE.whatsappCommunityUrl || SITE.social.whatsappChannel;

  return (
    <div className="bg-[#f5f5f5]">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Community', path: '/community' },
        ]}
      />

      <PageHero
        image={SITE.heroHome}
        alt="Fast Data Services WhatsApp community"
        eyebrow="WhatsApp community"
        title="Stay connected with Fast Data Services"
        description="Join our community for bundle alerts, promo codes, order tips, and friendly support from the team."
      />

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card-elevated p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mt-3 font-bold text-royal">{title}</h2>
              <p className="mt-2 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#081F3F] to-[#0A2E5D] p-8 text-center">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">Ready to join?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-300">
            Tap below to open WhatsApp and join the official {SITE.name} community group.
          </p>
          <a
            href={communityUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400"
          >
            <MessageCircle className="h-4 w-4" />
            Join on WhatsApp
          </a>
          <p className="mt-4">
            <Link href="/#shop-bundles" className="inline-flex items-center gap-1 text-xs font-semibold text-gold-glow hover:underline">
              Or browse bundles first <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
