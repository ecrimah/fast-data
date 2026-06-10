import Image from 'next/image';
import { ReactNode } from 'react';

interface PageHeroProps {
  image: string;
  alt: string;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}

export function PageHero({ image, alt, eyebrow, title, description, children }: PageHeroProps) {
  return (
    <section className="relative min-h-[320px] overflow-hidden sm:min-h-[380px] lg:min-h-[420px]">
      <Image src={image} alt={alt} fill priority className="object-cover" sizes="100vw" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(135deg, rgba(8,31,63,0.88) 0%, rgba(10,46,93,0.75) 50%, rgba(8,31,63,0.85) 100%)
          `,
        }}
      />
      <div className="relative mx-auto flex min-h-[320px] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center sm:min-h-[380px] sm:px-6 sm:py-20 lg:min-h-[420px] lg:px-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-glow">
          {eyebrow}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-200">{description}</p>
        {children}
      </div>
    </section>
  );
}
