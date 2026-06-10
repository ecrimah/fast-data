'use client';

import Link from 'next/link';
import { MessageCircle, Users, ArrowRight } from 'lucide-react';
import { SITE } from '@/lib/brand';

export function WhatsAppCommunitySection() {
  const communityUrl = SITE.whatsappCommunityUrl || SITE.social.whatsappChannel;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 via-[#081F3F] to-[#0A2E5D] p-6 sm:p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <Users className="h-3 w-3" /> Community
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">Join our WhatsApp community</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Get flash deals, bundle alerts, and quick help from the Fast Data Services team and other customers in Ghana.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={communityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
            >
              <MessageCircle className="h-4 w-4" />
              Join community
            </a>
            <Link
              href="/community"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
            >
              Learn more
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
