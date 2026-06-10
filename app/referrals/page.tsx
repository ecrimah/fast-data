'use client';

'use client';

import { Referrals } from '@/views/Referrals';
import { useUser } from '@/contexts/UserContext';
import { PageHero } from '@/components/layout/PageHero';
import { SITE } from '@/lib/brand';

export default function ReferralsPage() {
  const { user } = useUser();

  return (
    <div className="bg-[#f5f5f5]">
      <PageHero
        image={SITE.heroReferrals}
        alt="Refer friends and earn rewards with Fast Data Services"
        eyebrow="Referrals"
        title="Invite friends, earn rewards"
        description="Share your code and earn wallet credit when friends buy their first data bundle."
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Referrals user={user} />
      </div>
    </div>
  );
}
