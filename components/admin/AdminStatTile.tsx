import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TileTone = 'gold' | 'amber' | 'sky' | 'violet' | 'emerald' | 'rose' | 'slate';

export function AdminStatTile({
  icon,
  tone,
  label,
  value,
  hint,
  valueAccent,
  className,
}: {
  icon: ReactNode;
  tone: TileTone;
  label: string;
  value: string;
  hint?: string;
  valueAccent?: 'gold' | 'emerald' | 'rose';
  className?: string;
}) {
  return (
    <div className={cn('stat-tile', className)}>
      <div className={cn('stat-tile-icon', `tile-icon-${tone}`)}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="stat-tile-label">{label}</p>
        <p className={cn('stat-tile-value', valueAccent && `is-${valueAccent}`)}>{value}</p>
        {hint && <p className="stat-tile-hint">{hint}</p>}
      </div>
    </div>
  );
}

export function AdminSectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('section-card', className)}>
      <div className="section-card-header">
        <div>
          <h3 className="font-extrabold tracking-tight text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: 'success' | 'warn' | 'danger' | 'neutral' | 'info';
  children: ReactNode;
}) {
  return <span className={cn('susu-pill', `susu-pill-${tone}`)}>{children}</span>;
}
