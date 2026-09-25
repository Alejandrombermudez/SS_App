import type { ReactNode } from 'react';
import { formatCOP } from '../../utils/format';
import { EXPIRY_LABEL, INVOICE_COLORS as C, type ExpiryState, type Field, type InvoiceModel } from './invoiceModel';

/** Documento de misión (cotización / orden de servicio) en HTML: lo que se ve en pantalla y se imprime. */
export default function InvoiceView({ m }: { m: InvoiceModel }) {
  return (
    <article className="invoice-paper relative mx-auto w-full max-w-[816px] overflow-hidden bg-white p-4 text-[13px] leading-snug text-neutral-900 shadow-xl sm:p-10">
      {/* CABECERA */}
      <header className="flex items-center gap-3 sm:gap-5">
        <img src="/brand/agente.png" alt="" className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-700 sm:text-[11px]">Servicio Secreto</p>
          <p className="font-serif text-xl font-black uppercase leading-none tracking-wide sm:text-3xl" style={{ color: C.red }}>
            Motorcycles
          </p>
          {m.contactLine && <p className="mt-1 truncate text-[11px] text-neutral-500">{m.contactLine}</p>}
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-500 sm:text-[10px]">Documento de misión</p>
          <p className="font-mono text-2xl font-bold leading-tight sm:text-3xl">Nº {m.number}</p>
          <span
            className="mt-1 inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.15em]"
            style={m.isQuote ? { border: `1.5px solid ${C.red}`, color: C.red } : { backgroundColor: C.red, color: 'white' }}
          >
            {m.statusLabel}
          </span>
        </div>
      </header>

      <div className="mt-4 border-y border-neutral-200 py-2">
        <img src="/brand/lineas.png" alt="Offroad · Road of City · Sportbike · Adventure · Custom" className="mx-auto h-9 w-auto opacity-80 sm:h-11" />
      </div>
      <div className="h-1" style={{ backgroundColor: C.red }} />

      {/* CLIENTE / OBJETIVO / MISIÓN */}
      <div className="mt-5 grid gap-5 sm:grid-cols-[1.15fr_1.15fr_1fr]">
        <Block title="Datos del cliente">
          <p className="text-[15px] font-bold uppercase">{m.client.name}</p>
          <Fields fields={m.client.fields} />
        </Block>

        <Block title="Datos del objetivo">
          <span className="inline-block rounded-[3px] border-2 border-black bg-[#F6C700] px-2 py-px font-mono text-base font-bold tracking-[0.2em]">
            {m.vehicle.plate}
          </span>
          {m.vehicle.title && <p className="mt-1 font-bold uppercase">{m.vehicle.title}</p>}
          {m.vehicle.details && <p className="text-neutral-600">{m.vehicle.details}</p>}
          {m.vehicle.soat.date && <Expiry label="SOAT" date={m.vehicle.soat.date} state={m.vehicle.soat.state} />}
          {m.vehicle.tecno.date && <Expiry label="Tecno" date={m.vehicle.tecno.date} state={m.vehicle.tecno.state} />}
        </Block>

        <Block title="Documento de misión">
          <Fields fields={m.mission} />
        </Block>
      </div>

      {m.initialNotes && <Notes title="Observaciones iniciales">{m.initialNotes}</Notes>}

      {/* DETALLES (SERVICIOS) */}
      {m.serviceCount > 0 && (
        <section className="mt-6">
          <Bar color={C.services} title="Detalles de la misión" />
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider" style={{ color: C.services }}>
                <th className="w-14 py-1.5 pl-1 pr-2 font-bold">Ítem</th>
                <th className="hidden w-28 py-1.5 pr-2 font-bold sm:table-cell">Sección</th>
                <th className="py-1.5 pr-2 font-bold">Descripción</th>
                <th className="w-10 py-1.5 pr-2 text-center font-bold">Cant.</th>
                <th className="hidden w-24 py-1.5 pr-2 text-right font-bold sm:table-cell">Precio</th>
                <th className="w-24 py-1.5 pr-1 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {m.serviceRows.map((l, i) => (
                <tr
                  key={`${l.itemCode}-${i}`}
                  className="align-top"
                  style={{
                    borderTop: l.firstOfSection && i > 0 ? '1px solid #9DB2D1' : undefined,
                    backgroundColor: i % 2 ? C.servicesTint : undefined,
                  }}
                >
                  <td className="py-1 pl-1 pr-2 font-mono text-[11px] text-neutral-500">{l.itemCode}</td>
                  <td className="hidden py-1 pr-2 text-[11px] font-semibold uppercase sm:table-cell" style={{ color: C.services }}>
                    {l.firstOfSection ? l.section : ''}
                  </td>
                  <td className="py-1 pr-2">
                    {l.description}
                    {l.firstOfSection && <span className="block text-[10px] uppercase text-neutral-400 sm:hidden">{l.section}</span>}
                  </td>
                  <td className="py-1 pr-2 text-center">{l.quantity}</td>
                  <td className="hidden py-1 pr-2 text-right sm:table-cell">{formatCOP(l.price)}</td>
                  <td className="py-1 pr-1 text-right">{formatCOP(l.quantity * l.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
            {m.discountPct > 0 ? (
              <div className="flex-1 rounded border-l-4 bg-amber-50 px-3 py-2 sm:max-w-sm" style={{ borderColor: '#D97706' }}>
                <p className="font-mono text-[11px] font-bold uppercase tracking-wide text-amber-800">¡Alerta! Pago en efectivo</p>
                <p className="text-[12px] text-amber-900">
                  Aplica un descuento especial del <strong>{m.discountPct}%</strong> sobre los servicios.
                </p>
                {m.business.discountNote && <p className="mt-0.5 text-[11px] font-semibold text-amber-800">{m.business.discountNote}</p>}
              </div>
            ) : (
              <div />
            )}
            <div className="w-full sm:w-72">
              <TotalRow label="Subtotal de servicios" value={formatCOP(m.totals.subtotal)} />
              {m.discountPct > 0 && (
                <TotalRow label={`Descuento ${m.discountPct}%`} value={`− ${formatCOP(m.totals.discount)}`} color={C.red} />
              )}
              <TotalRow label="Total de servicios" value={formatCOP(m.totals.servicesTotal)} strong color={C.services} tint={C.servicesTint} />
            </div>
          </div>
        </section>
      )}

      {/* RECURSOS */}
      {m.parts.length > 0 && (
        <section className="mt-6">
          <Bar color={C.parts} title="Recursos de la misión" />
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-wider" style={{ color: C.parts }}>
                <th className="w-24 py-1.5 pl-1 pr-2 font-bold">Tipo</th>
                <th className="py-1.5 pr-2 font-bold">Descripción</th>
                <th className="w-10 py-1.5 pr-2 text-center font-bold">Cant.</th>
                <th className="hidden w-24 py-1.5 pr-2 text-right font-bold sm:table-cell">Precio</th>
                <th className="w-24 py-1.5 pr-1 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {m.parts.map((p, i) => (
                <tr key={i} className="align-top" style={i % 2 ? { backgroundColor: C.partsTint } : undefined}>
                  <td className="py-1 pl-1 pr-2 text-[11px] text-neutral-600">{p.type}</td>
                  <td className="py-1 pr-2">{p.description}</td>
                  <td className="py-1 pr-2 text-center">{p.quantity}</td>
                  <td className="hidden py-1 pr-2 text-right sm:table-cell">{formatCOP(p.price)}</td>
                  <td className="py-1 pr-1 text-right">{formatCOP(p.quantity * p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end border-t-2" style={{ borderColor: C.parts }}>
            <div className="w-full sm:w-72">
              <TotalRow label="Total de recursos" value={formatCOP(m.totals.partsTotal)} strong color={C.parts} tint={C.partsTint} />
            </div>
          </div>
        </section>
      )}

      {m.finalNotes && <Notes title="Observaciones finales">{m.finalNotes}</Notes>}

      {/* COSTO TOTAL */}
      <div className="mt-7 flex items-center gap-4">
        <img src="/brand/sello.png" alt="" className="hidden h-24 w-24 -rotate-12 opacity-90 sm:block" />
        <div className="flex flex-1 flex-col gap-1 bg-neutral-900 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between" style={{ borderLeft: `8px solid ${C.red}` }}>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] sm:text-xs">
            Costo total de la misión Nº {Number(m.number)}
          </span>
          <span className="text-2xl font-bold tabular-nums">{formatCOP(m.totals.total)}</span>
        </div>
      </div>

      {/* PIE */}
      <footer className="mt-7 border-t border-neutral-300 pt-3 text-center text-[10.5px] text-neutral-500">
        {m.validityNote && <p className="font-semibold text-neutral-700">{m.validityNote}</p>}
        {m.business.footerNote && <p>{m.business.footerNote}</p>}
        {(m.business.address || m.business.city) && <p>{[m.business.address, m.business.city].filter(Boolean).join(', ')}</p>}
        <p className="mt-1 font-mono uppercase tracking-wider">
          {m.business.name} · Documento generado el {m.generatedOn}
        </p>
      </footer>
    </article>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 border-b-2 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: C.red, borderColor: C.ink }}>
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function Fields({ fields }: { fields: Field[] }) {
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[12.5px]">
      {fields.map((f) => (
        <div key={f.label} className="contents">
          <dt className="text-neutral-500">{f.label}</dt>
          <dd className="min-w-0 break-words font-medium">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Expiry({ label, date, state }: { label: string; date: string; state: ExpiryState }) {
  const color = state === 'expired' ? C.red : state === 'soon' ? '#B45309' : '#404040';
  return (
    <p className="text-[12px]" style={{ color }}>
      <span className="text-neutral-500">{label} vence </span>
      <span className="font-medium">{date}</span>
      {(state === 'expired' || state === 'soon') && <strong className="ml-1 uppercase">· {EXPIRY_LABEL[state]}</strong>}
    </p>
  );
}

function Bar({ color, title }: { color: string; title: string }) {
  return (
    <h3 className="px-2 py-1 text-center font-mono text-[12px] font-bold uppercase tracking-[0.25em] text-white" style={{ backgroundColor: color }}>
      {title}
    </h3>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
  color,
  tint,
}: {
  label: string;
  value: string;
  strong?: boolean;
  color?: string;
  tint?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between border-b border-neutral-200 px-2 py-1.5 tabular-nums ${strong ? 'font-bold' : ''}`}
      style={tint ? { backgroundColor: tint } : undefined}
    >
      <span className={strong ? '' : 'text-neutral-600'} style={strong && color ? { color } : undefined}>
        {label}
      </span>
      <span className="font-semibold" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Notes({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-5 border-l-4 bg-neutral-50 px-4 py-2.5" style={{ borderColor: C.red }}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{title}</p>
      <p className="mt-1 whitespace-pre-line">{children}</p>
    </div>
  );
}
