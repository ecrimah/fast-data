import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Pending',
  robots: { index: false, follow: false },
};

export default function PaymentPendingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
