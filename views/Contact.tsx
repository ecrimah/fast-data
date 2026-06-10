'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  Bot,
  ArrowRight,
} from 'lucide-react';
import { SITE } from '@/lib/brand';

const CHANNELS = [
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    desc: 'Fastest response — order help, delivery issues, or general questions.',
    href: `https://wa.me/${SITE.supportWhatsApp.replace(/\D/g, '')}`,
    cta: 'Chat on WhatsApp',
    tone: 'emerald',
  },
  {
    icon: Bot,
    title: 'Tay AI',
    desc: 'Instant answers about bundles, pricing, order status, and payments.',
    action: 'chat',
    cta: 'Open Tay chat',
    tone: 'gold',
  },
  {
    icon: Mail,
    title: 'Email',
    desc: 'For account issues, partnerships, or detailed enquiries.',
    href: `mailto:${SITE.supportEmail}`,
    cta: SITE.supportEmail,
    tone: 'sky',
  },
] as const;

export function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    const subject = encodeURIComponent(form.subject || `Contact from ${form.name}`);
    window.location.href = `mailto:${SITE.supportEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const openTay = () => window.dispatchEvent(new CustomEvent('open-tay-chat'));

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative isolate flex min-h-[420px] items-center overflow-hidden sm:min-h-[460px] lg:min-h-[520px]">
        <div className="absolute inset-0 -z-20">
          <Image
            src={SITE.heroContact}
            alt="Fast Data Services customer support team ready to help"
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: '70% 25%' }}
          />
        </div>

        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: `
              linear-gradient(95deg,
                rgba(8, 31, 63, 0.94) 0%,
                rgba(8, 31, 63, 0.88) 38%,
                rgba(10, 46, 93, 0.55) 62%,
                rgba(10, 46, 93, 0.2) 100%),
              linear-gradient(180deg,
                rgba(8, 31, 63, 0.0) 0%,
                rgba(8, 31, 63, 0.15) 70%,
                rgba(8, 31, 63, 0.75) 100%)
            `,
          }}
        />

        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background: 'radial-gradient(ellipse 45% 50% at 12% 30%, rgba(212, 175, 55, 0.14), transparent 70%)',
          }}
        />

        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold-glow">Get in touch</p>
            <h1
              className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl"
              style={{ textShadow: '0 4px 24px rgba(0,0,0,0.45)' }}
            >
              We&apos;re here to help
            </h1>
            <p
              className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
            >
              Questions about a bundle, payment, or delivery? Reach us on WhatsApp, chat with Tay, or send a message below.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Channels */}
          <div className="space-y-4 lg:col-span-1">
            {CHANNELS.map((ch) => (
              <div
                key={ch.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-royal/10 text-royal">
                  <ch.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-bold text-royal">{ch.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{ch.desc}</p>
                {'href' in ch && ch.href ? (
                  <a
                    href={ch.href}
                    target={ch.href.startsWith('http') ? '_blank' : undefined}
                    rel={ch.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-dark hover:text-royal"
                  >
                    {ch.cta}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={openTay}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-dark hover:text-royal"
                  >
                    {ch.cta}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Details</h4>
              <ul className="mt-3 space-y-3 text-xs text-slate-600">
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" />
                  {SITE.supportWhatsApp}
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" />
                  {SITE.supportEmail}
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" />
                  Accra, Ghana
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-dark" />
                  Mon – Sat · 8am – 8pm GMT
                </li>
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-royal">Send us a message</h2>
              <p className="mt-1 text-xs text-slate-500">
                Fill in the form and your email client will open — we typically reply within a few hours.
              </p>

              {sent ? (
                <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                  <p className="font-bold text-emerald-800">Opening your email app…</p>
                  <p className="mt-2 text-sm text-emerald-700">
                    If nothing opened, email us directly at{' '}
                    <a href={`mailto:${SITE.supportEmail}`} className="font-semibold underline">
                      {SITE.supportEmail}
                    </a>
                  </p>
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="mt-4 text-xs font-semibold text-emerald-700 underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="text-xs font-semibold text-slate-600">
                      Your name
                    </label>
                    <input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="fds-input mt-1 !border-slate-200 !bg-slate-50 !text-slate-800"
                      placeholder="Kwame Asante"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="text-xs font-semibold text-slate-600">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="fds-input mt-1 !border-slate-200 !bg-slate-50 !text-slate-800"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="subject" className="text-xs font-semibold text-slate-600">
                      Subject
                    </label>
                    <input
                      id="subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="fds-input mt-1 !border-slate-200 !bg-slate-50 !text-slate-800"
                      placeholder="Order not delivered / Payment issue / General"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="message" className="text-xs font-semibold text-slate-600">
                      Message
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="fds-input mt-1 min-h-[120px] resize-y !border-slate-200 !bg-slate-50 !text-slate-800"
                      placeholder="Tell us how we can help…"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white gradient-accent shadow-md shadow-gold/20"
                    >
                      <Send className="h-4 w-4" />
                      Send message
                    </button>
                  </div>
                </form>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">
              Need data now?{' '}
              <Link href="/" className="font-semibold text-royal hover:underline">
                Browse bundles on the shop
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
