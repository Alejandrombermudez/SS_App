import { describe, expect, it } from 'vitest';
import { computeTotals, groupBySection, lineTotal, priceForCategory } from './orderMath';

describe('priceForCategory', () => {
  it('los servicios fijos cuestan lo del catálogo en cualquier categoría', () => {
    for (const cat of ['BAJO', 'MEDIO', 'ALTO']) {
      expect(priceForCategory({ costType: 'Fijo', price: 50000 }, cat)).toBe(50000);
    }
  });

  it('los variables se multiplican x1, x2, x3 según la categoría', () => {
    const s = { costType: 'Variable', price: 25000 };
    expect(priceForCategory(s, 'BAJO')).toBe(25000);
    expect(priceForCategory(s, 'MEDIO')).toBe(50000);
    expect(priceForCategory(s, 'alto')).toBe(75000);
  });

  it('una categoría inválida en un servicio variable es un error, como en Access', () => {
    expect(() => priceForCategory({ costType: 'Variable', price: 1 }, '')).toThrow(/no válida/);
  });
});

describe('computeTotals', () => {
  it('reproduce la orden 16 de Access: descuento solo sobre servicios', () => {
    // Access guardó Subtotal 1.415.000 (desactualizado); con sus líneas reales el subtotal es 1.440.000.
    const t = computeTotals([{ quantity: 1, price: 1440000 }], [{ quantity: 1, price: 200000 }], 20);
    expect(t).toEqual({ subtotal: 1440000, discount: 288000, servicesTotal: 1152000, partsTotal: 200000, total: 1352000 });
  });

  it('reproduce la orden 20 de Access', () => {
    const t = computeTotals([{ quantity: 1, price: 1390000 }], [{ quantity: 2, price: 384000 }], 10);
    expect(t).toEqual({ subtotal: 1390000, discount: 139000, servicesTotal: 1251000, partsTotal: 768000, total: 2019000 });
  });

  it('sin líneas todo es cero', () => {
    expect(computeTotals([], [], 10).total).toBe(0);
  });

  it('acota el porcentaje entre 0 y 100', () => {
    expect(computeTotals([{ quantity: 1, price: 1000 }], [], 150).discount).toBe(1000);
    expect(computeTotals([{ quantity: 1, price: 1000 }], [], -5).discount).toBe(0);
  });

  it('redondea el descuento a pesos enteros', () => {
    expect(computeTotals([{ quantity: 1, price: 1005 }], [], 5).discount).toBe(50);
  });
});

describe('lineTotal y groupBySection', () => {
  it('cantidad por precio', () => {
    expect(lineTotal(3, 12000)).toBe(36000);
    expect(lineTotal(Number.NaN, 12000)).toBe(0);
  });

  it('agrupa por sección en el orden de códigos del catálogo', () => {
    const groups = groupBySection([
      { section: 'Motor', itemCode: '8002' },
      { section: 'Admisión', itemCode: '1003' },
      { section: 'Motor', itemCode: '8001' },
    ]);
    expect(groups.map(([s, l]) => [s, l.length])).toEqual([['Admisión', 1], ['Motor', 2]]);
  });
});
