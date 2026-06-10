'use client';

import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { SITE } from '@/lib/brand';

export function FinalCta() {
  const openTayChat = () => {
    window.dispatchEvent(new CustomEvent('open-tay-chat'));
  };

  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div
        className="mx-auto max-w-7xl overflow-hidden rounded-2xl"
        style={{
          background: `
            radial-gradient(at 18% 12%, rgba(212, 175, 55, 0.14) 0px, transparent 45%),
            radial-gradient(at 82% 8%, rgba(244, 209, 96, 0.08) 0px, transparent 50%),
            linear-gradient(135deg, #061d45 0%, #0a2e5d 60%, #0d3a6e 100%)
          `,
        }}
      >
        <div className="relative px-6 py-12 text-center sm:px-12 lg:py-16">
          <span className="eyebrow text-gold-glow">Need help or ready to buy?</span>
          <h2 className="display-1 mx-auto mt-3 max-w-2xl text-white">
            Tay is here for you.{' '}
            <span className="text-aurora">Orders, tracking & support.</span>
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-slate-300">
            Say &quot;I want 5GB MTN&quot; and Tay will guide you through payment — or browse bundles yourself below.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openTayChat}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white gradient-accent shadow-lg shadow-gold/25"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with Tay
            </button>
            <Link
              href="/wallet"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
            >
              Open wallet
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            Powered by{' '}
            <a
              href={SITE.poweredBy.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-glow hover:underline"
            >
              {SITE.poweredBy.name}
            </a>
            {' '}· Available 24/7 on this site
          </p>
        </div>
      </div>
    </section>
  );
}
