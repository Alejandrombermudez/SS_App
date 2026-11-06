import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAllOrders } from '../../data/allOrders';
import { CenteredMessage, Plate, ScreenHeader, Section, Spinner } from '../../components/ui';
import { formatCOP, formatDate, formatOrderNumber, todayIso } from '../../utils/format';
import { bimesterPeriod, byMonth, inPeriod, monthPeriod, summarize, type Period } from '../../utils/finance';

type Mode = 'month' | 'bimester' | 'range';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const BIMESTERS = ['Ene – Feb', 'Mar – Abr', 'May – Jun', 'Jul – Ago', 'Sep – Oct', 'Nov – Dic'];

const field = 'rounded-md border border-gray-600 bg-black/30 px-3 py-2 text-sm text-white focus:border-white focus:outline-none';

export default function FinanceScreen() {
  const navigate = useNavigate();
  const orders = useAllOrders();
  const today = todayIso();
  const [mode, setMode] = useState<Mode>('month');
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [bimester, setBimester] = useState(Math.ceil(Number(today.slice(5, 7)) / 2));
  const [from, setFrom] = useState(`${today.slice(0, 4)}-01-01`);
  const [to, setTo] = useState(today);

  const years = useMemo(() => {
    const ys = new Set(orders.data.map((o) => Number(o.entryDate.slice(0, 4))).filter(Boolean));
    ys.add(Number(today.slice(0, 4)));
    return [...ys].sort((a, b) => b - a);
  }, [orders.data, today]);

  const period: Period =
    mode === 'month' ? monthPeriod(year, month) : mode === 'bimester' ? bimesterPeriod(year, bimester) : { from, to };

  const selected = useMemo(() => inPeriod(orders.data, period), [orders.data, period.from, period.to]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = useMemo(() => summarize(selected), [selected]);
  const months = useMemo(() => byMonth(selected), [selected]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0A192F] text-white">
      <ScreenHeader title="Finanzas" subtitle="Órdenes de servicio por fecha de ingreso" onBack={() => navigate('/')} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-3">
        {/* PERIODO */}
        <div className="rounded-lg bg-[#112240] p-3">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['month', 'Mes'],
                ['bimester', 'Bimestre'],
                ['range', 'Rango'],
              ] as [Mode, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setMode(k)}
                className={`rounded-md border py-2 text-sm font-medium ${mode === k ? 'border-white bg-white text-black' : 'border-gray-600 text-gray-300'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {mode !== 'range' && (
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={field} aria-label="Año">
                {years.map((y) => (
                  <option key={y} value={y} className="bg-[#0A192F]">
                    {y}
                  </option>
                ))}
              </select>
            )}
            {mode === 'month' && (
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={`${field} flex-1`} aria-label="Mes">
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1} className="bg-[#0A192F]">
                    {m}
                  </option>
                ))}
              </select>
            )}
            {mode === 'bimester' && (
              <select value={bimester} onChange={(e) => setBimester(Number(e.target.value))} className={`${field} flex-1`} aria-label="Bimestre">
                {BIMESTERS.map((b, i) => (
                  <option key={b} value={i + 1} className="bg-[#0A192F]">
                    {b}
                  </option>
                ))}
              </select>
            )}
            {mode === 'range' && (
              <>
                <label className="flex flex-1 flex-col text-xs text-gray-400">
                  Desde
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${field} mt-1`} />
                </label>
                <label className="flex flex-1 flex-col text-xs text-gray-400">
                  Hasta
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${field} mt-1`} />
                </label>
              </>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            {formatDate(period.from)} – {formatDate(period.to)}
          </p>
        </div>

        {orders.loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : orders.error ? (
          <CenteredMessage>{orders.error}</CenteredMessage>
        ) : (
          <>
            {/* GANANCIA */}
            <div className="mt-4 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-wider text-emerald-200">Ganancia (mano de obra)</p>
              <p className="mt-1 text-3xl font-bold">{formatCOP(s.labor)}</p>
              {s.discount > 0 && <p className="mt-1 text-xs text-emerald-100/80">Ya descontados {formatCOP(s.discount)} en descuentos</p>}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Motocicletas" value={String(s.motorcycles)} hint={`${s.missions} órdenes`} />
              <Stat label="Servicios" value={String(s.services)} hint="unidades" />
              <Stat label="Repuestos" value={String(s.parts)} hint={formatCOP(s.partsTotal)} />
              <Stat label="Total facturado" value={formatCOP(s.total)} hint="servicios + repuestos" />
            </div>

            {months.length > 1 && (
              <Section title="Mes a mes">
                <div className="overflow-x-auto rounded-lg bg-[#112240]">
                  <table className="w-full text-sm tabular-nums">
                    <thead className="text-left text-xs text-gray-400">
                      <tr>
                        <Th>Mes</Th>
                        <Th right>Motos</Th>
                        <Th right>Serv.</Th>
                        <Th right>Rep.</Th>
                        <Th right>Ganancia</Th>
                        <Th right>Total</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {months.map(([m, ms]) => (
                        <tr key={m} className="border-t border-white/5">
                          <Td>{MONTHS[Number(m.slice(5, 7)) - 1].slice(0, 3)} {m.slice(0, 4)}</Td>
                          <Td right>{ms.motorcycles}</Td>
                          <Td right>{ms.services}</Td>
                          <Td right>{ms.parts}</Td>
                          <Td right>{formatCOP(ms.labor)}</Td>
                          <Td right>{formatCOP(ms.total)}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            )}

            <Section title={`Órdenes del periodo · ${selected.length}`}>
              {selected.length === 0 ? (
                <p className="rounded-lg bg-[#112240] p-4 text-sm text-gray-400">No hay órdenes de servicio en este periodo.</p>
              ) : (
                <ul className="space-y-1.5">
                  {[...selected]
                    .sort((a, b) => b.entryDate.localeCompare(a.entryDate) || b.number - a.number)
                    .map((o) => (
                      <li key={o.number}>
                        <button
                          type="button"
                          onClick={() => navigate(`/orders/${o.number}`)}
                          className="flex w-full items-center gap-3 rounded-lg bg-[#112240] px-3 py-2 text-left text-sm hover:bg-[#15294d]"
                        >
                          <span className="font-mono text-xs font-bold">Nº {formatOrderNumber(o.number)}</span>
                          <Plate plate={o.vehiclePlate} size="sm" />
                          <span className="text-xs text-gray-400">{formatDate(o.entryDate)}</span>
                          <span className="ml-auto text-right">
                            <span className="block font-semibold text-emerald-300">{formatCOP(o.servicesTotal)}</span>
                            <span className="block text-[11px] text-gray-400">total {formatCOP(o.total)}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </Section>

            <p className="mt-6 text-center text-[11px] text-gray-500">
              Solo órdenes de servicio (no cotizaciones) que no están eliminadas. La ganancia es la mano de obra con
              descuento; los repuestos se muestran aparte.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg bg-[#112240] p-3">
      <p className="text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 truncate text-lg font-bold">{value}</p>
      {hint && <p className="truncate text-[11px] text-gray-500">{hint}</p>}
    </div>
  );
}

const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <th className={`px-3 py-2 font-medium ${right ? 'text-right' : ''}`}>{children}</th>
);
const Td = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <td className={`whitespace-nowrap px-3 py-2 ${right ? 'text-right' : ''}`}>{children}</td>
);
