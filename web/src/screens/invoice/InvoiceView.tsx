import type { ReactNode } from 'react';
import { formatCOP } from '../../utils/format';
import { EXPIRY_LABEL, type ExpiryState, type InvoiceModel } from './invoiceModel';

const RED = '#B80828';

/** Documento de misión (factura / cotización) en HTML: lo que se ve en pantalla y se imprime. */
export default function InvoiceView({ m }: { m: InvoiceModel }) {
  return (
    <article className="invoice-paper relative mx-auto w-full max-w-[816px] overflow-hidden bg-white p-5 text-[13px] leading-snug text-neutral-900 shadow-xl sm:p-12">
      {/* CABECERA */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <img src="/brand/agente.png" alt="" className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-800">Servicio Secreto</p>
            <p className="font-serif text-2xl font-black uppercase leading-none tracking-wide" style={{ color: RED }}>
              Motorcycles
            </p>
            {m.contactLine && <p className="mt-1.5 text-[11px] text-neutral-500">{m.contactLine}</p>}
            {(m.business.address || m.business.city) && (
              <p className="text-[11px] text-neutral-500">{[m.business.address, m.business.city].filter(Boolean).join(', ')}</p>
            )}
          </div>
        </div>

        <div className="sm:text-right">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-500">Documento de misión</p>
          <p className="font-mono text-3xl font-bold tracking-tight">Nº {m.number}</p>
          <span
            className="mt-1.5 inline-block rounded-sm px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
            style={m.isQuote ? { border: `1.5px solid ${RED}`, color: RED } : { backgroundColor: RED, color: 'white' }}
          >
            {m.statusLabel}
          </span>
        </div>
      </header>

      <div className="mt-5 h-1" style={{ backgroundColor: RED }} />
      <div className="mt-0.5 h-px bg-neutral-900" />

      {/* CLIENTE / VEHÍCULO / MISIÓN */}
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        <InfoBlock title="Cliente">
          <p className="text-[15px] font-bold">{m.client.name}</p>
          <Kv k="C.C. / NIT" v={m.client.id} />
          {m.client.phone && <Kv k="Teléfono" v={m.client.phone} />}
          {m.client.email && <Kv k="Correo" v={m.client.email} />}
        </InfoBlock>

        <InfoBlock title="Vehículo">
          <span className="inline-block rounded-[3px] border-2 border-black bg-[#F6C700] px-2 py-px font-mono text-base font-bold tracking-[0.2em]">
            {m.vehicle.plate}
          </span>
          {m.vehicle.title && <p className="mt-1 font-semibold">{m.vehicle.title}</p>}
          {m.vehicle.details && <p className="text-neutral-600">{m.vehicle.details}</p>}
          {m.vehicle.soat.date && <Expiry label="SOAT" date={m.vehicle.soat.date} state={m.vehicle.soat.state} />}
          {m.vehicle.tecno.date && <Expiry label="Tecnomecánica" date={m.vehicle.tecno.date} state={m.vehicle.tecno.state} />}
        </InfoBlock>

        <InfoBlock title="Misión">
          <Kv k="Servicio" v={m.mission.serviceType} />
          {m.mission.entry && <Kv k="Ingreso" v={m.mission.entry} />}
          {m.mission.exit && <Kv k="Salida" v={m.mission.exit} />}
          {m.mission.km && <Kv k="Kilometraje" v={m.mission.km} />}
        </InfoBlock>
      </div>

      {m.initialNotes && <Notes title="Observaciones iniciales">{m.initialNotes}</Notes>}

      {/* SERVICIOS */}
      {m.serviceGroups.length > 0 && (
        <>
          <SectionTitle>Detalles de la misión</SectionTitle>
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="border-b-2 border-neutral-900 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="w-14 py-1.5 pr-2 font-bold">Ítem</th>
                <th className="py-1.5 pr-2 font-bold">Descripción</th>
                <th className="w-10 py-1.5 pr-2 text-center font-bold">Cant.</th>
                <th className="hidden w-24 py-1.5 pr-2 text-right font-bold sm:table-cell">Precio</th>
                <th className="w-24 py-1.5 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {m.serviceGroups.map(([section, lines]) => (
                <SectionRows key={section} section={section}>
                  {lines.map((l, i) => (
                    <tr key={`${l.itemCode}-${i}`} className="border-b border-neutral-200 align-top">
                      <td className="py-1.5 pr-2 font-mono text-[11px] text-neutral-500">{l.itemCode}</td>
                      <td className="py-1.5 pr-2">{l.description}</td>
                      <td className="py-1.5 pr-2 text-center">{l.quantity}</td>
                      <td className="hidden py-1.5 pr-2 text-right sm:table-cell">{formatCOP(l.price)}</td>
                      <td className="py-1.5 text-right">{formatCOP(l.quantity * l.price)}</td>
                    </tr>
                  ))}
                </SectionRows>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* RECURSOS */}
      {m.parts.length > 0 && (
        <>
          <SectionTitle>Recursos de la misión</SectionTitle>
          <table className="w-full border-collapse tabular-nums">
            <thead>
              <tr className="border-b-2 border-neutral-900 text-left font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="w-24 py-1.5 pr-2 font-bold">Tipo</th>
                <th className="py-1.5 pr-2 font-bold">Descripción</th>
                <th className="w-10 py-1.5 pr-2 text-center font-bold">Cant.</th>
                <th className="hidden w-24 py-1.5 pr-2 text-right font-bold sm:table-cell">Precio</th>
                <th className="w-24 py-1.5 text-right font-bold">Total</th>
              </tr>
            </thead>
            <tbody>
              {m.parts.map((p, i) => (
                <tr key={i} className="border-b border-neutral-200 align-top">
                  <td className="py-1.5 pr-2 text-[11px] text-neutral-500">{p.type}</td>
                  <td className="py-1.5 pr-2">{p.description}</td>
                  <td className="py-1.5 pr-2 text-center">{p.quantity}</td>
                  <td className="hidden py-1.5 pr-2 text-right sm:table-cell">{formatCOP(p.price)}</td>
                  <td className="py-1.5 text-right">{formatCOP(p.quantity * p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* LIQUIDACIÓN */}
      <div className="mt-8 flex flex-col-reverse items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
        <img src="/brand/sello.png" alt="" className="h-28 w-28 -rotate-12 opacity-90 sm:h-32 sm:w-32" />
        <div className="w-full tabular-nums sm:w-80">
          <TotalRow label="Subtotal de servicios" value={formatCOP(m.totals.subtotal)} />
          {m.discountPct > 0 && (
            <TotalRow label={`Descuento ${m.discountPct}%*`} value={`− ${formatCOP(m.totals.discount)}`} accent />
          )}
          <TotalRow label="Total de servicios" value={formatCOP(m.totals.servicesTotal)} />
          <TotalRow label="Total de recursos" value={formatCOP(m.totals.partsTotal)} />
          <div className="mt-2 flex items-center justify-between bg-neutral-900 px-3 py-2.5 text-white" style={{ borderLeft: `6px solid ${RED}` }}>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider">Costo total de la misión</span>
            <span className="text-lg font-bold">{formatCOP(m.totals.total)}</span>
          </div>
          {m.discountPct > 0 && m.business.discountNote && (
            <p className="mt-1.5 text-[10.5px] leading-tight text-neutral-500">* {m.business.discountNote}</p>
          )}
        </div>
      </div>

      {m.finalNotes && <Notes title="Observaciones finales">{m.finalNotes}</Notes>}

      {/* PIE */}
      <footer className="mt-8 border-t border-neutral-300 pt-3 text-center text-[10.5px] text-neutral-500">
        {m.validityNote && <p className="font-semibold text-neutral-700">{m.validityNote}</p>}
        {m.business.footerNote && <p>{m.business.footerNote}</p>}
        <p className="mt-1 font-mono uppercase tracking-wider">
          {m.business.name} · Documento generado el {m.generatedOn}
        </p>
      </footer>
    </article>
  );
}

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 border-b border-neutral-300 pb-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: RED }}>
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <p>
      <span className="text-neutral-500">{k}: </span>
      <span className="font-medium">{v}</span>
    </p>
  );
}

function Expiry({ label, date, state }: { label: string; date: string; state: ExpiryState }) {
  const color = state === 'expired' ? RED : state === 'soon' ? '#B45309' : '#525252';
  return (
    <p className="text-[12px]" style={{ color }}>
      {label}: {date}
      {state !== 'ok' && state !== 'unknown' && <strong className="ml-1 uppercase">({EXPIRY_LABEL[state]})</strong>}
    </p>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-1 mt-7 flex items-center gap-2 font-mono text-[12px] font-bold uppercase tracking-[0.2em]">
      <span className="inline-block h-3 w-1.5" style={{ backgroundColor: RED }} />
      {children}
    </h3>
  );
}

function SectionRows({ section, children }: { section: string; children: ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={5} className="bg-neutral-100 px-1 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-neutral-600">
          {section}
        </td>
      </tr>
      {children}
    </>
  );
}

function TotalRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-200 px-1 py-1.5">
      <span className="text-neutral-600">{label}</span>
      <span className="font-semibold" style={accent ? { color: RED } : undefined}>
        {value}
      </span>
    </div>
  );
}

function Notes({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6 border-l-4 bg-neutral-50 px-4 py-2.5" style={{ borderColor: RED }}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{title}</p>
      <p className="mt-1 whitespace-pre-line">{children}</p>
    </div>
  );
}
