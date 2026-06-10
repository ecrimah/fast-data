import { SITE } from '@/lib/brand';

export const SITE_KNOWLEDGE = `
${SITE.name} — ${SITE.tagline}

Networks: MTN, Telecel (formerly Vodafone), AT (AirtelTigo)
Bundles: Non-expiry data. Sizes from 1GB to 100GB.
Payment: Moolre Mobile Money (MoMo) or wallet balance (signed-in users).
Delivery: Usually 2–10 minutes after payment is confirmed.
Support email: ${SITE.supportEmail}

How to buy via chat:
1. Tell us network (MTN, Telecel, or AT)
2. Choose bundle size in GB
3. Provide beneficiary phone number (10 digits, Ghana)
4. Confirm total price
5. Pay with MoMo link or wallet

Order tracking: Provide your payment reference (starts with FDS-) or the phone number used on the order.
`.trim();

export function searchSiteKnowledge(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('network') || q.includes('mtn') || q.includes('telecel') || q.includes('at')) {
    return 'We sell data for MTN, Telecel, and AT. All bundles are non-expiry.';
  }
  if (q.includes('pay') || q.includes('momo') || q.includes('wallet')) {
    return 'Pay with Moolre Mobile Money (any network MoMo) or wallet if you are signed in.';
  }
  if (q.includes('deliver') || q.includes('how long') || q.includes('time')) {
    return 'Orders are usually delivered within 2–10 minutes after payment is confirmed.';
  }
  if (q.includes('expir')) {
    return 'Our data bundles do not expire — non-expiry packages.';
  }
  return SITE_KNOWLEDGE;
}
