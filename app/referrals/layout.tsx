import type { Metadata } from 'next';
import { SITE } from '@/lib/brand';
import { BreadcrumbJsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Refer & Earn',
  description:
    'Invite friends to Fast Data Services and earn rewards on their first data bundle purchase in Ghana.',
  alternates: { canonical: '/referrals' },
  openGraph: {
    title: `Refer & Earn | ${SITE.name}`,
    description: 'Earn rewards when friends buy data bundles with Fast Data Services.',
    url: `${SITE.url}/referrals`,
    images: [SITE.ogImage],
  },
};

export default function ReferralsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', path: '/' },
          { name: 'Referrals', path: '/referrals' },
        ]}
      />
      {children}
    </>
  );
}
