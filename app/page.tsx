'use client';

import { HeroSection } from '@/components/home/HeroSection';
import { HowItWorks } from '@/components/home/HowItWorks';
import { NetworkCoverage } from '@/components/home/NetworkCoverage';
import { FaqSection } from '@/components/home/FaqSection';
import { FinalCta } from '@/components/home/FinalCta';
import { WhatsAppCommunitySection } from '@/components/home/WhatsAppCommunitySection';
import { Shop } from '@/views/Shop';

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorks />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Shop />
      </div>
      <WhatsAppCommunitySection />
      <NetworkCoverage />
      <FaqSection />
      <FinalCta />
    </>
  );
}
