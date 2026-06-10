import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from './providers';
import { SITE } from '@/lib/brand';
import { OrganizationJsonLd, WebSiteJsonLd, StoreJsonLd } from '@/components/seo/JsonLd';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | Buy Non-Expiry MTN, Telecel & AT Data Bundles in Ghana`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: 'Telecommunications',
  alternates: {
    canonical: '/',
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  icons: {
    icon: [
      { url: SITE.icon },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: SITE.icon,
    shortcut: SITE.icon,
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} | Instant Non-Expiry Data Bundles in Ghana`,
    description: SITE.description,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — Buy non-expiry MTN, Telecel and AT data bundles in Ghana`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} | Instant Data Bundles in Ghana`,
    description: SITE.shortDescription,
    images: [SITE.ogImage],
    creator: SITE.twitterHandle,
    site: SITE.twitterHandle,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    'geo.region': 'GH-AA',
    'geo.placename': 'Accra',
  },
};

export const viewport: Viewport = {
  themeColor: '#081F3F',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans bg-[#f5f5f5] text-[#111111] antialiased`}>
        <OrganizationJsonLd />
        <WebSiteJsonLd />
        <StoreJsonLd />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
