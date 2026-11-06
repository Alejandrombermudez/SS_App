import { describe, expect, it } from 'vitest';
import type { Order } from '../types';
import { bimesterPeriod, byMonth, inPeriod, monthPeriod, summarize } from './finance';

const order = (number: number, entryDate: string, extra: Partial<Order> = {}): Order =>
  ({
    number,
    entryDate,
    status: 'Orden de Servicio',
    deleted: false,
    vehiclePlate: `PLA${number}`,
    services: [{ itemCode: '1', section: '', description: '', quantity: 2, price: 10000, total: 20000 }],
    parts: [{ type: 'Repuesto', description: '', quantity: 3, price: 5000, total: 15000 }],
    subtotal: 20000,
    discount: 2000,
    servicesTotal: 18000,
    partsTotal: 15000,
    total: 33000,
    ...extra,
  }) as Order;

describe('finanzas', () => {
  it('periodos de mes y bimestre (incluye fin de mes y años bisiestos)', () => {
    expect(monthPeriod(2026, 2)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(monthPeriod(2028, 2).to).toBe('2028-02-29');
    expect(bimesterPeriod(2026, 1)).toEqual({ from: '2026-01-01', to: '2026-02-28' });
    expect(bimesterPeriod(2026, 6)).toEqual({ from: '2026-11-01', to: '2026-12-31' });
  });

  it('solo cuenta órdenes de servicio activas dentro del periodo', () => {
    const list = [
      order(1, '2026-05-10'),
      order(2, '2026-05-31'),
      order(3, '2026-06-01'),
      order(4, '2026-05-15', { status: 'Cotización' }),
      order(5, '2026-05-16', { deleted: true }),
    ];
    expect(inPeriod(list, monthPeriod(2026, 5)).map((o) => o.number)).toEqual([1, 2]);
  });

  it('la ganancia es la mano de obra; motos distintas; unidades de servicios y repuestos', () => {
    const s = summarize([order(1, '2026-05-10'), order(2, '2026-05-12', { vehiclePlate: 'PLA1' })]);
    expect(s).toMatchObject({ missions: 2, motorcycles: 1, services: 4, parts: 6, labor: 36000, partsTotal: 30000, total: 66000, discount: 4000 });
  });

  it('agrupa por mes en orden', () => {
    const months = byMonth([order(1, '2026-06-02'), order(2, '2026-05-10'), order(3, '2026-05-20')]);
    expect(months.map(([m, s]) => [m, s.missions])).toEqual([['2026-05', 2], ['2026-06', 1]]);
  });
});
