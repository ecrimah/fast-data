/** Fast Data Services brand palette — navy & gold */
export const BRAND = {
  royalBlue: '#0A2E5D',
  metallicGold: '#D4AF37',
  deepNavy: '#081F3F',
  softWhite: '#F5F5F5',
  eliteBlack: '#111111',
  goldGlow: '#F4D160',
  goldDark: '#8B7320',
  royalMid: '#0d3a6e',
} as const;

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.fastdataservices.store').replace(/\/$/, '');

export const SITE = {
  name: 'Fast Data Services',
  shortName: 'FDS',
  legalName: 'Fast Data Services',
  tagline: 'Fast Connection. Reliable Data. Everytime.',
  description:
    'Buy cheap non-expiry MTN, Telecel & AT data bundles in Ghana. Instant delivery, pay with Mobile Money (MoMo), track orders, and get 24/7 help from Tay — your AI assistant.',
  shortDescription: 'Instant non-expiry MTN, Telecel & AT data bundles in Ghana. Pay with MoMo.',
  url: SITE_URL,
  domain: 'fastdataservices.store',
  logo: '/logo.png',
  icon: '/icon.png',
  ogImage: '/og-image.png',
  founded: '2024',
  priceRange: 'GH₵',
  geo: { lat: 5.6037, lng: -0.187 },
  address: {
    city: 'Accra',
    region: 'Greater Accra',
    country: 'GH',
    countryName: 'Ghana',
  },
  keywords: [
    'data bundles Ghana',
    'buy data Ghana',
    'MTN data bundle',
    'Telecel data bundle',
    'AT data bundle',
    'AirtelTigo data',
    'non-expiry data Ghana',
    'cheap data bundles Ghana',
    'MTN data Ghana',
    'mobile data Ghana',
    'MoMo data purchase',
    'buy internet bundle Ghana',
    'instant data Ghana',
    'affordable data Ghana',
    'Fast Data Services',
  ],
  social: {
    whatsappChannel: '',
    facebook: '',
    instagram: '',
    twitter: '',
    tiktok: '',
  },
  twitterHandle: '@fastdatagh',
  poweredBy: {
    name: 'Tay',
    url: 'https://www.lovelacetaytech.com',
  },
  whatsappCommunityUrl: 'https://chat.whatsapp.com/',
  heroAuth: '/hero-auth.png',
  heroContact: '/hero-contact.png',
  heroFaq: '/hero-faq.png',
  heroGuides: '/hero-guides.png',
  heroReferrals: '/hero-referrals.png',
  heroHome: '/hero-slide-1.png',
  heroSlides: [
    {
      src: '/hero-slide-1.png',
      alt: 'Buy MTN, Telecel and AT data bundles instantly with Fast Data Services',
      caption: 'Instant bundles',
    },
    {
      src: '/hero-slide-2.png',
      alt: 'Pay securely with MoMo and get your data delivered in minutes',
      caption: 'MoMo checkout',
    },
    {
      src: '/hero-slide-3.png',
      alt: 'Stay connected across Ghana with reliable non-expiry data',
      caption: 'Stay connected',
    },
  ] as const,
  supportEmail: 'support@fastdataservices.com',
  supportWhatsApp: '+233200000000',
  paymentRefPrefix: 'FDS',
  adminDemoEmail: 'admin@fastdataservices.com',
  currency: 'GHS',
} as const;

export const BRAND_GRADIENT = {
  background: `linear-gradient(135deg, ${BRAND.deepNavy} 0%, ${BRAND.royalBlue} 100%)`,
  goldButton: `linear-gradient(135deg, ${BRAND.metallicGold} 0%, ${BRAND.goldGlow} 100%)`,
  goldText: `linear-gradient(120deg, ${BRAND.goldGlow} 0%, ${BRAND.metallicGold} 50%, ${BRAND.goldGlow} 100%)`,
} as const;
