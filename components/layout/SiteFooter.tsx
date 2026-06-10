'use client';

import Link from 'next/link';
import { MessageCircle, Mail, ShieldCheck, Lock } from 'lucide-react';
import { SITE } from '@/lib/brand';
import { FdsLogo } from '@/components/brand/FdsLogo';

const FOOTER_LINKS = {
  'Buy Data': [
    { href: '/mtn-data-bundles', label: 'MTN Data Bundles' },
    { href: '/telecel-data-bundles', label: 'Telecel Data Bundles' },
    { href: '/at-data-bundles', label: 'AT Data Bundles' },
    { href: '/wallet', label: 'My Wallet' },
  ],
  Company: [
    { href: '/contact', label: 'Contact us' },
    { href: '/referrals', label: 'Referrals' },
    { href: '/guides', label: 'Guides' },
    { href: '/faq', label: 'FAQ' },
  ],
  Support: [
    { href: '#', label: 'Chat with Tay' },
    { href: '/guides', label: 'Data guides' },
    { href: `mailto:${SITE.supportEmail}`, label: 'Email us' },
  ],
};

export function SiteFooter() {
  return (
    <footer
      className="relative overflow-hidden border-t border-white/5"
      style={{
        background: `
          radial-gradient(at 12% 0%, rgba(212, 175, 55, 0.08) 0px, transparent 50%),
          radial-gradient(at 90% 100%, rgba(10, 46, 93, 0.4) 0px, transparent 50%),
          linear-gradient(180deg, #081F3F 0%, #0A2E5D 100%)
        `,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.45) 50%, transparent 100%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <FdsLogo size={40} />
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-slate-400">{SITE.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${SITE.supportWhatsApp.replace(/\D/g, '')}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={`mailto:${SITE.supportEmail}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-glow">{title}</h4>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.label === 'Chat with Tay' ? (
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-tay-chat'))}
                        className="text-xs text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </button>
                    ) : link.href.startsWith('mailto:') || link.href.startsWith('http') ? (
                      <a href={link.href} className="text-xs text-slate-400 transition-colors hover:text-white">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-xs text-slate-400 transition-colors hover:text-white">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/5 pt-6 text-[10px] uppercase tracking-[0.14em] text-slate-500">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Lock className="h-3 w-3" />
            Secure payments
          </span>
          <span>Moolre · MoMo</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="h-3 w-3" />
            Verified delivery
          </span>
          <span>Powered by Tay</span>
        </div>

        <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-white/5 pt-4 text-center sm:flex-row sm:text-left">
          <p className="text-[11px] text-slate-500">
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="pulse-dot" />
            Built in Ghana
          </p>
        </div>
      </div>
    </footer>
  );
}
