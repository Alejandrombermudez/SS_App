import type { Order } from '../types';

export interface FinanceSummary {
  missions: number;
  motorcycles: number; // placas distintas
  services: number; // unidades de servicio (suma de cantidades)
  parts: number; // unidades de repuestos/recursos (suma de cantidades)
  subtotal: number; // servicios antes de descuento
  discount: number;
  labor: number; // ganancia: mano de obra (servicios con descuento)
  partsTotal: number; // repuestos (se cobran al costo, no son ganancia)
  total: number; // total facturado
}

export interface Period {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(y, m, 0).getDate(); // m: 1-12

export function monthPeriod(year: number, month: number): Period {
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay(year, month))}` };
}

/** Bimestre 1 = ene-feb, 2 = mar-abr, … 6 = nov-dic. */
export function bimesterPeriod(year: number, bimester: number): Period {
  const first = (bimester - 1) * 2 + 1;
  return { from: `${year}-${pad(first)}-01`, to: `${year}-${pad(first + 1)}-${pad(lastDay(year, first + 1))}` };
}

/**
 * Solo cuentan las órdenes de servicio (no cotizaciones) que no están eliminadas, por fecha de
 * ingreso. La ganancia del taller es la mano de obra; los repuestos se reportan aparte.
 */
export function inPeriod(orders: Order[], p: Period): Order[] {
  return orders.filter((o) => !o.deleted && o.status === 'Orden de Servicio' && o.entryDate >= p.from && o.entryDate <= p.to);
}

export function summarize(orders: Order[]): FinanceSummary {
  const sum = (f: (o: Order) => number) => orders.reduce((n, o) => n + f(o), 0);
  return {
    missions: orders.length,
    motorcycles: new Set(orders.map((o) => o.vehiclePlate)).size,
    services: sum((o) => o.services.reduce((n, l) => n + (Number(l.quantity) || 0), 0)),
    parts: sum((o) => o.parts.reduce((n, l) => n + (Number(l.quantity) || 0), 0)),
    subtotal: sum((o) => o.subtotal),
    discount: sum((o) => o.discount),
    labor: sum((o) => o.servicesTotal),
    partsTotal: sum((o) => o.partsTotal),
    total: sum((o) => o.total),
  };
}

/** Resumen mes a mes dentro del periodo (para la tabla). */
export function byMonth(orders: Order[]): [string, FinanceSummary][] {
  const groups = new Map<string, Order[]>();
  for (const o of orders) {
    const key = o.entryDate.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), o]);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, list]) => [k, summarize(list)]);
}
