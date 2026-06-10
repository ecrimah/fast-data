import type { Metadata } from 'next';
import { SITE } from '@/lib/brand';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Contact & Support',
  description:
    'Get in touch with Fast Data Services. Chat on WhatsApp, ask Tay AI, or email us for help with MTN, Telecel and AT data bundles in Ghana.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: `Contact & Support | ${SITE.name}`,
    description: 'Reach Fast Data Services on WhatsApp, Tay AI, or email for help with your data bundles.',
    url: `${SITE.url}/contact`,
    images: [SITE.ogImage],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Contact', path: '/contact' },
        ]}
      />
      {children}
    </>
  );
}
