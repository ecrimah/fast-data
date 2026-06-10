import { MousePointerClick, Wallet, Zap, Bot } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    icon: MousePointerClick,
    title: 'Pick your bundle',
    desc: 'Choose MTN, Telecel or AT — from 1GB to 100GB, all non-expiry.',
  },
  {
    num: '02',
    icon: Wallet,
    title: 'Pay your way',
    desc: 'Mobile Money via Moolre or pay instantly from your wallet balance.',
  },
  {
    num: '03',
    icon: Zap,
    title: 'Receive in minutes',
    desc: 'Automated delivery through our supplier network — usually under 2 minutes.',
  },
  {
    num: '04',
    icon: Bot,
    title: 'Ask Tay anytime',
    desc: 'Order, track, or get help through Tay — your AI assistant on this site.',
  },
];

export function HowItWorks() {
  return (
    <section className="bg-white px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-xl">
          <span className="eyebrow text-gold-dark">How it works</span>
          <h2 className="display-2 mt-2 text-[#111]">
            From tap to data on your line — fast and simple.
          </h2>
          <p className="mt-2 text-sm text-muted">
            No USSD codes, no waiting on hold. Buy directly or let Tay handle it for you.
          </p>
        </div>

        <ol className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.num} className="card-elevated card-lift relative overflow-hidden p-4">
              <span className="num absolute right-3 top-3 text-3xl font-extrabold tracking-tighter text-slate-100">
                {step.num}
              </span>
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-accent text-white shadow shadow-gold/25">
                  <step.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-[#111]">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{step.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
