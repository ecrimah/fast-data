import { Radio } from 'lucide-react';

const NETWORKS = [
  { id: 'mtn', name: 'MTN', bar: 'bg-mtn', coverage: 'Nationwide', note: 'Yellow powerhouse' },
  { id: 'telecel', name: 'Telecel', bar: 'bg-telecel', coverage: 'Nationwide', note: 'Former Vodafone' },
  { id: 'at', name: 'AirtelTigo', bar: 'bg-at', coverage: 'Nationwide', note: 'AT network' },
];

export function NetworkCoverage() {
  return (
    <section className="bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="eyebrow text-gold-dark">Coverage</span>
            <h2 className="display-2 mt-2 text-[#111]">Every major network in Ghana</h2>
          </div>
          <p className="max-w-sm text-sm text-muted">One hub for all three — same price per GB, same fast delivery.</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {NETWORKS.map((n) => (
            <div key={n.id} className="card-elevated overflow-hidden p-0">
              <div className={`h-1.5 ${n.bar}`} />
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 text-royal" />
                  <h3 className="font-extrabold text-royal">{n.name}</h3>
                </div>
                <p className="mt-2 text-xs text-muted">{n.note}</p>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-gold-dark">{n.coverage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
