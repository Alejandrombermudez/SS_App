import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

/** Barra superior de las pantallas internas. */
export function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack: () => void;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 bg-black px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <button type="button" onClick={onBack} aria-label="Volver" className="rounded p-1 text-white hover:bg-white/10">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-medium text-white">{title}</h1>
        {subtitle && <p className="truncate text-xs text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

/** Placa estilo colombiano (amarilla, letras negras). */
export function Plate({ plate, size = 'md' }: { plate: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-sm',
    lg: 'px-3 py-1 text-xl',
  }[size];
  return (
    <span
      className={`inline-block rounded-[4px] border-2 border-black bg-[#F6C700] font-mono font-bold tracking-widest text-black ${cls}`}
    >
      {plate}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const isOrder = status === 'Orden de Servicio';
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isOrder ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-400/20 text-amber-200'
      }`}
    >
      {isOrder ? 'Orden de servicio' : 'Cotización'}
    </span>
  );
}

export function Spinner({ className = 'h-8 w-8' }: { className?: string }) {
  return <div className={`animate-spin rounded-full border-2 border-white/30 border-t-white ${className}`} />;
}

export function CenteredMessage({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-400">{children}</div>;
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
