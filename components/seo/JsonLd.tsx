import { SITE } from '@/lib/brand';
import { PRICE_PER_GB } from '@/constants';

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

const ORG_ID = `${SITE.url}/#organization`;
const WEBSITE_ID = `${SITE.url}/#website`;
const STORE_ID = `${SITE.url}/#store`;

function sameAs(): string[] {
  return Object.values(SITE.social)
    .map((v) => String(v))
    .filter((v) => v.length > 0);
}

/** Organization — establishes Authoritativeness & Trust (E-E-A-T). */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': ORG_ID,
        name: SITE.name,
        legalName: SITE.legalName,
        url: SITE.url,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE.url}${SITE.logo}`,
          width: 512,
          height: 512,
        },
        image: `${SITE.url}${SITE.ogImage}`,
        description: SITE.description,
        foundingDate: SITE.founded,
        email: SITE.supportEmail,
        slogan: SITE.tagline,
        areaServed: {
          '@type': 'Country',
          name: 'Ghana',
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: SITE.address.city,
          addressRegion: SITE.address.region,
          addressCountry: SITE.address.country,
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: SITE.supportEmail,
            telephone: SITE.supportWhatsApp,
            availableLanguage: ['en'],
            areaServed: 'GH',
          },
        ],
        sameAs: sameAs(),
      }}
    />
  );
}

/** WebSite — enables sitelinks search box. */
export function WebSiteJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE.url,
        name: SITE.name,
        description: SITE.shortDescription,
        inLanguage: 'en-GH',
        publisher: { '@id': ORG_ID },
      }}
    />
  );
}

/** Store with offer catalog — surfaces the data bundle products. */
export function StoreJsonLd() {
  const networks = ['MTN', 'Telecel', 'AT (AirtelTigo)'];
  const sizes = [1, 2, 5, 10, 20, 50, 100];

  const itemListElement = networks.flatMap((network) =>
    sizes.map((gb) => ({
      '@type': 'Offer',
      name: `${gb}GB ${network} Non-Expiry Data Bundle`,
      category: 'Mobile Data Bundle',
      priceCurrency: 'GHS',
      price: (gb * PRICE_PER_GB).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: SITE.url,
      seller: { '@id': ORG_ID },
    }))
  );

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'OnlineStore',
        '@id': STORE_ID,
        name: SITE.name,
        url: SITE.url,
        image: `${SITE.url}${SITE.ogImage}`,
        description: SITE.description,
        priceRange: SITE.priceRange,
        currenciesAccepted: 'GHS',
        paymentAccepted: 'Mobile Money (MoMo), Wallet',
        areaServed: { '@type': 'Country', name: 'Ghana' },
        parentOrganization: { '@id': ORG_ID },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Data Bundles',
          itemListElement,
        },
      }}
    />
  );
}

/** FAQ — wins FAQ rich results and answers buyer intent. */
export function FaqJsonLd({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }}
    />
  );
}

/** Breadcrumbs for non-home pages. */
export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: `${SITE.url}${item.path}`,
        })),
      }}
    />
  );
}
