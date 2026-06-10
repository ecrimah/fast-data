export interface GuideSection {
  heading: string;
  body: string[];
}

export interface Guide {
  slug: string;
  title: string;
  h1: string;
  description: string;
  excerpt: string;
  category: string;
  datePublished: string;
  dateModified: string;
  readMinutes: number;
  sections: GuideSection[];
  faqs?: { q: string; a: string }[];
}

export const GUIDES: Guide[] = [
  {
    slug: 'how-to-buy-mtn-data-in-ghana',
    title: 'How to Buy MTN Data in Ghana (2026 Step-by-Step Guide)',
    h1: 'How to Buy MTN Data Bundles in Ghana',
    description:
      'A simple step-by-step guide to buying MTN data bundles in Ghana online — choose a bundle, pay with Mobile Money, and get instant non-expiry data.',
    excerpt:
      'Buying MTN data online is faster than USSD. Here is exactly how to do it in under a minute.',
    category: 'Buying Guide',
    datePublished: '2026-01-15',
    dateModified: '2026-06-10',
    readMinutes: 3,
    sections: [
      {
        heading: 'Why buy MTN data online instead of USSD?',
        body: [
          'Dialling long USSD codes is slow and easy to get wrong. Buying MTN data online with Fast Data Services takes under a minute, shows you the exact price upfront, and delivers non-expiry data straight to any MTN number in Ghana.',
          'You also get an SMS confirmation and can track every order, so you are never left wondering whether your data landed.',
        ],
      },
      {
        heading: 'Step-by-step: buy MTN data in under a minute',
        body: [
          '1. Open the Fast Data Services shop and select MTN as your network.',
          '2. Choose your bundle size — anything from 1GB to 100GB. All MTN bundles are non-expiry.',
          '3. Enter the MTN phone number that should receive the data.',
          '4. Pay securely with Mobile Money (MoMo) from any network.',
          '5. Your data is delivered automatically, usually within 2 minutes, with an SMS confirmation.',
        ],
      },
      {
        heading: 'How much does MTN data cost?',
        body: [
          'Fast Data Services uses one simple rate per GB with no hidden fees, so a 10GB bundle is exactly ten times the 1GB price. You always see the total before you pay.',
        ],
      },
    ],
    faqs: [
      {
        q: 'How long does MTN data take to arrive?',
        a: 'Most MTN bundles are delivered automatically within 2–10 minutes after your Mobile Money payment is confirmed.',
      },
      {
        q: 'Can I buy MTN data for another number?',
        a: 'Yes — just enter the recipient MTN number at checkout and the bundle is sent directly to them.',
      },
    ],
  },
  {
    slug: 'cheapest-data-bundles-ghana',
    title: 'Cheapest Data Bundles in Ghana (MTN, Telecel & AT)',
    h1: 'How to Get the Cheapest Data Bundles in Ghana',
    description:
      'Looking for cheap data in Ghana? Learn how non-expiry MTN, Telecel and AT bundles save you money, and how to buy them instantly with MoMo.',
    excerpt:
      'Cheap data is not just about price per GB — non-expiry bundles save you the most over time. Here is why.',
    category: 'Money Saving',
    datePublished: '2026-02-02',
    dateModified: '2026-06-10',
    readMinutes: 4,
    sections: [
      {
        heading: 'What makes a data bundle "cheap"?',
        body: [
          'A bundle is only truly cheap if you actually use all of it. Many telco bundles expire daily or weekly, so you lose whatever you do not finish. Non-expiry bundles from Fast Data Services let you use every megabyte you pay for — which usually works out far cheaper in the long run.',
        ],
      },
      {
        heading: 'Compare networks: MTN, Telecel and AT',
        body: [
          'Fast Data Services offers the same low per-GB rate across MTN, Telecel and AT, so you can pick whichever network has the best coverage where you are without paying more.',
          'Whether you need a small 1GB top-up or a heavy 100GB bundle, the price scales fairly with no surprises.',
        ],
      },
      {
        heading: 'Tips to spend less on data in Ghana',
        body: [
          'Buy larger non-expiry bundles less often instead of small daily ones that expire.',
          'Use Wi-Fi for big downloads and updates.',
          'Track your usage so you only buy what you need.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Are non-expiry bundles really cheaper?',
        a: 'Over time, yes. You never lose unused data, so you effectively pay only for what you use.',
      },
    ],
  },
  {
    slug: 'what-is-non-expiry-data',
    title: 'What Is Non-Expiry Data? (And Why It Saves You Money)',
    h1: 'Non-Expiry Data Explained',
    description:
      'Non-expiry data never expires until you use it. Learn how non-expiry MTN, Telecel and AT bundles work in Ghana and why they beat daily bundles.',
    excerpt:
      'No more losing data at midnight. Here is how non-expiry bundles work and why they are worth it.',
    category: 'Explainer',
    datePublished: '2026-03-10',
    dateModified: '2026-06-10',
    readMinutes: 3,
    sections: [
      {
        heading: 'Non-expiry data, simply explained',
        body: [
          'Non-expiry data is a data bundle that stays on your line until you finish it — there is no daily, weekly, or monthly deadline. If you buy 10GB and use 4GB this week, the remaining 6GB is still there next month.',
        ],
      },
      {
        heading: 'Why it beats daily and weekly bundles',
        body: [
          'Time-limited bundles force you to use data fast or lose it. Non-expiry bundles remove that pressure, so your money is never wasted. This is especially valuable if your usage changes from week to week.',
        ],
      },
      {
        heading: 'How to get non-expiry data in Ghana',
        body: [
          'Every bundle sold on Fast Data Services — across MTN, Telecel and AT — is non-expiry. Just choose your size, pay with MoMo, and the data is delivered within minutes.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Does non-expiry data ever get deducted?',
        a: 'Only when you use it. There is no time-based expiry on Fast Data Services bundles.',
      },
    ],
  },
  {
    slug: 'how-to-pay-for-data-with-momo',
    title: 'How to Pay for Data with Mobile Money (MoMo) in Ghana',
    h1: 'How to Pay for Data Bundles with MoMo',
    description:
      'Pay for MTN, Telecel and AT data bundles securely with Mobile Money in Ghana. Step-by-step MoMo payment guide with instant delivery.',
    excerpt:
      'MoMo is the easiest way to pay for data in Ghana. Here is how the secure checkout works.',
    category: 'Payments',
    datePublished: '2026-04-05',
    dateModified: '2026-06-10',
    readMinutes: 3,
    sections: [
      {
        heading: 'Paying with Mobile Money, step by step',
        body: [
          '1. Add your data bundle to checkout and choose Mobile Money as your payment method.',
          '2. Confirm the amount — you always see the exact total before paying.',
          '3. Approve the secure MoMo prompt on your phone.',
          '4. Once payment is confirmed, your data is delivered automatically with an SMS receipt.',
        ],
      },
      {
        heading: 'Is paying with MoMo safe?',
        body: [
          'Yes. Payments are processed securely through Moolre, and every order is verified before delivery. If a payment ever fails, you are not charged.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Which networks’ MoMo can I use?',
        a: 'You can pay with Mobile Money from any network — MTN MoMo, Telecel Cash, or AT Money.',
      },
      {
        q: 'What if my payment fails?',
        a: 'If a payment is not confirmed, no data is sent and you are not charged. You can simply try again.',
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
