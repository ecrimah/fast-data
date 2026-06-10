import type { Metadata } from 'next';
import { SITE } from '@/lib/brand';

export const metadata: Metadata = {
  title: 'Sign In',
  description: `Sign in to your ${SITE.name} account to manage orders, wallet, and referrals.`,
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
