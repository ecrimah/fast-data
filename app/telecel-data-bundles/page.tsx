import type { Metadata } from 'next';
import { NetworkLanding } from '@/components/landing/NetworkLanding';
import { NETWORK_LANDINGS } from '@/lib/networks';
import { SITE } from '@/lib/brand';

const data = NETWORK_LANDINGS['telecel-data-bundles'];

export const metadata: Metadata = {
  title: data.title,
  description: data.description,
  alternates: { canonical: `/${data.slug}` },
  openGraph: {
    title: data.title,
    description: data.description,
    url: `${SITE.url}/${data.slug}`,
    images: [SITE.ogImage],
  },
};

export default function Page() {
  return <NetworkLanding data={data} />;
}
