import { PRICE_PER_GB } from '@/constants';

export type NetworkLandingSlug = 'mtn-data-bundles' | 'telecel-data-bundles' | 'at-data-bundles';

export interface NetworkLanding {
  slug: NetworkLandingSlug;
  network: string;
  shortName: string;
  aka?: string;
  accent: string;
  image: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  highlights: string[];
  faqs: { q: string; a: string }[];
}

export const LANDING_SIZES = [1, 2, 3, 5, 10, 15, 20, 50, 100];

export function priceFor(gb: number): string {
  return (gb * PRICE_PER_GB).toFixed(2);
}

export const NETWORK_LANDINGS: Record<NetworkLandingSlug, NetworkLanding> = {
  'mtn-data-bundles': {
    slug: 'mtn-data-bundles',
    network: 'MTN',
    shortName: 'MTN',
    accent: '#FFCB05',
    image: '/net-mtn.png',
    h1: 'Buy MTN Data Bundles in Ghana',
    title: 'MTN Data Bundles in Ghana — Instant, Non-Expiry',
    description:
      'Buy cheap non-expiry MTN data bundles in Ghana from 1GB to 100GB. Instant delivery, pay with MoMo, and track your order. Best MTN data prices online.',
    intro:
      'Get affordable MTN data bundles delivered to any MTN number in Ghana within minutes. All MTN bundles are non-expiry, so your data never goes to waste. Pay securely with Mobile Money and let Tay AI help you order or track anytime.',
    highlights: [
      'Non-expiry MTN data — use it at your own pace',
      'Instant automated delivery, usually under 2 minutes',
      'Pay with any MoMo wallet — fast and secure',
      'Buy from 1GB up to 100GB at one low rate per GB',
    ],
    faqs: [
      {
        q: 'How do I buy MTN data on Fast Data Services?',
        a: 'Pick your MTN bundle size, enter the recipient MTN number, pay with Mobile Money, and your data is delivered automatically within minutes.',
      },
      {
        q: 'Do MTN bundles expire?',
        a: 'No. All MTN data bundles sold on Fast Data Services are non-expiry and remain on the line until used.',
      },
      {
        q: 'Can I buy MTN data for someone else?',
        a: 'Yes. Just enter the beneficiary MTN phone number at checkout and the bundle is sent directly to that number.',
      },
    ],
  },
  'telecel-data-bundles': {
    slug: 'telecel-data-bundles',
    network: 'Telecel',
    shortName: 'Telecel',
    aka: 'formerly Vodafone',
    accent: '#E60000',
    image: '/net-telecel.png',
    h1: 'Buy Telecel Data Bundles in Ghana',
    title: 'Telecel (Vodafone) Data Bundles in Ghana — Instant',
    description:
      'Buy non-expiry Telecel (formerly Vodafone) data bundles in Ghana from 1GB to 100GB. Instant delivery, MoMo payment, and order tracking. Affordable Telecel data online.',
    intro:
      'Top up any Telecel (formerly Vodafone) number in Ghana with affordable non-expiry data bundles. Orders are delivered automatically within minutes after your Mobile Money payment is confirmed.',
    highlights: [
      'Non-expiry Telecel data bundles',
      'Automatic delivery in minutes',
      'Secure Mobile Money payments',
      'Sizes from 1GB to 100GB',
    ],
    faqs: [
      {
        q: 'Is Telecel the same as Vodafone?',
        a: 'Yes. Telecel is the rebranded Vodafone Ghana network. Our Telecel bundles work on all former Vodafone numbers.',
      },
      {
        q: 'How fast is Telecel data delivered?',
        a: 'Most Telecel data bundles are delivered within 2–10 minutes after your Mobile Money payment is confirmed.',
      },
      {
        q: 'Do Telecel bundles expire?',
        a: 'No. All Telecel data bundles on Fast Data Services are non-expiry.',
      },
    ],
  },
  'at-data-bundles': {
    slug: 'at-data-bundles',
    network: 'AT',
    shortName: 'AT',
    aka: 'AirtelTigo',
    accent: '#0066B3',
    image: '/net-at.png',
    h1: 'Buy AT (AirtelTigo) Data Bundles in Ghana',
    title: 'AT (AirtelTigo) Data Bundles in Ghana — Instant',
    description:
      'Buy non-expiry AT (AirtelTigo) data bundles in Ghana from 1GB to 100GB. Instant delivery, pay with MoMo, and track orders. Cheap AirtelTigo data online.',
    intro:
      'Buy affordable AT (AirtelTigo) data bundles for any AT number in Ghana. All bundles are non-expiry and delivered automatically within minutes of payment.',
    highlights: [
      'Non-expiry AT (AirtelTigo) data',
      'Fast automated delivery',
      'Pay with Mobile Money',
      'Bundles from 1GB to 100GB',
    ],
    faqs: [
      {
        q: 'What is AT?',
        a: 'AT (AirtelTigo) is the merged Airtel and Tigo network in Ghana. Our AT bundles work on all AirtelTigo numbers.',
      },
      {
        q: 'How long does AT data take to arrive?',
        a: 'AT data bundles are usually delivered within a few minutes after your Mobile Money payment is confirmed.',
      },
      {
        q: 'Do AT bundles expire?',
        a: 'No. All AT (AirtelTigo) data bundles on Fast Data Services are non-expiry.',
      },
    ],
  },
};

export const NETWORK_LANDING_SLUGS = Object.keys(NETWORK_LANDINGS) as NetworkLandingSlug[];
