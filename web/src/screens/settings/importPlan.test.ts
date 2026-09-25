import { describe, expect, it } from 'vitest';
import { buildPlan, isPlaceholderEmail, type AccessExport } from './importPlan';

const exp: AccessExport = {
  exported_at: '2026-09-25T11:00:00',
  source: 'test.accdb',
  clients: [
    { id: '100', name: 'Ana Pérez', phone: '300', email: '', instagram: '@ana', birth_date: '1990-01-01', gender: 'FEMENINO', profession: 'Ingeniera' },
    { id: '200', name: 'Luis', phone: '301', email: 'l@x.co', instagram: '', birth_date: '', gender: '', profession: '' },
  ],
  vehicles: [{ plate: 'ABC12D', brand: 'Yamaha', line: 'XT660Z', model: '2012', cc: '660', category: 'ALTO', km: '15000', soat_date: '', tecno_date: '', client_id: '100' }],
  services: [{ item_code: '8001', section: 'Motor', description: 'Aceite', cost_type: 'Variable', price: 20000, service_group: 'Especifico' }],
  orders: [
    {
      number: 16,
      status: 'Cotización',
      vehicle_plate: 'ABC12D',
      client_id: '100',
      service_type: 'Especifico',
      entry_date: '2025-10-21',
      exit_date: '',
      km: 15000,
      initial_notes: '',
      final_notes: '',
      discount_pct: 20,
      vehicle_category: 'ALTO',
      services: [{ item_code: '8001', section: 'Motor', description: 'Aceite', quantity: 1, price: 1440000, total: 1440000 }],
      parts: [{ type: 'Repuesto', description: 'Filtro', quantity: 1, price: 200000, total: 200000 }],
      access_totals: { subtotal: 1415000, discount: 283000, services_total: 1132000, parts_total: 200000, total: 1332000 },
    },
  ],
  professions: ['Ingeniera'],
  warnings: [],
};

const empty = () => ({
  clients: new Map(),
  vehicles: new Map(),
  services: new Map(),
  orders: new Map(),
  professions: new Set<string>(),
  clientAccounts: new Map(),
  counter: 0,
});

describe('isPlaceholderEmail', () => {
  it('reconoce los correos de relleno de Access para no enlazarlos nunca a un portal', () => {
    for (const e of ['abc@gmail.com', 'ABC@gmail.com', 'asd@gmail.com', 'abc@google.com', 'test@hotmail.com', 'sin-arroba']) {
      expect(isPlaceholderEmail(e), e).toBe(true);
    }
    for (const e of ['juan.perez@gmail.com', 'abcd@gmail.com', 'jninot@unal.edu.co']) {
      expect(isPlaceholderEmail(e), e).toBe(false);
    }
  });
});

describe('buildPlan', () => {
  it('enlaza cada correo de cliente con su cédula para el portal', () => {
    const plan = buildPlan(exp, empty());
    expect(plan.client_accounts).toEqual([
      expect.objectContaining({ id: 'l@x.co', kind: 'new', data: { client_id: '200' } }),
    ]);
  });

  it('vacía los valores de relleno de Access que ya se habían migrado', () => {
    const existing = empty();
    existing.clients.set('200', { name: 'Luis', phone: '301', email: 'l@x.co', instagram: '@abc' });
    existing.clients.set('100', { name: 'Ana Pérez', email: 'ABC@gmail.com' });
    const plan = buildPlan(exp, existing);
    expect(plan.clients[1]).toMatchObject({ kind: 'update', data: { instagram: '' } });
    expect(plan.clients[0].data).toMatchObject({ email: '' });
  });

  it('todo es nuevo en una base vacía, con los totales recalculados', () => {
    const plan = buildPlan(exp, empty());
    expect(plan.clients.map((c) => c.kind)).toEqual(['new', 'new']);
    expect(plan.clients[0].data).toMatchObject({ address: '', city: '', name: 'Ana Pérez' });
    expect(plan.orders[0].data).toMatchObject({ subtotal: 1440000, discount: 288000, total: 1352000, source: 'access' });
    expect(plan.totalsFixed).toEqual([{ number: 16, access: 1332000, computed: 1352000 }]);
    expect(plan.counterTo).toBe(16);
  });

  it('en registros existentes solo cambia lo distinto y nunca borra con vacíos', () => {
    const existing = empty();
    existing.clients.set('200', { name: 'Luis', phone: '301', email: 'l@x.co', address: 'Calle 1', instagram: '@luis' });
    const plan = buildPlan(exp, existing);
    // Access no tiene instagram para Luis: se conserva el de la app.
    expect(plan.clients[1]).toMatchObject({ kind: 'same', changes: [] });
  });

  it('el kilometraje de la moto nunca baja', () => {
    const existing = empty();
    existing.vehicles.set('ABC12D', { brand: 'Yamaha', km: '20000' });
    const plan = buildPlan(exp, existing);
    expect(plan.vehicles[0].data.km).toBeUndefined(); // 20000 > 15000: no se toca
  });

  it('no pisa misiones creadas en la app con el mismo número', () => {
    const existing = empty();
    existing.orders.set('16', { number: 16, source: 'app' });
    expect(buildPlan(exp, existing).orders[0].kind).toBe('conflict');
  });

  it('no detecta cambios solo porque Firestore devuelva las claves en otro orden', () => {
    const first = buildPlan(exp, empty());
    const existing = empty();
    const reorder = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).reverse());
    const data = first.orders[0].data as Record<string, unknown>;
    existing.orders.set('16', {
      ...reorder(data),
      services: (data.services as Record<string, unknown>[]).map(reorder),
      parts: (data.parts as Record<string, unknown>[]).map(reorder),
    });
    expect(buildPlan(exp, existing).orders[0].kind).toBe('same');
  });

  it('una segunda importación no cambia nada (idempotente)', () => {
    const first = buildPlan(exp, empty());
    const existing = empty();
    first.clients.forEach((c) => existing.clients.set(c.id, c.data));
    first.vehicles.forEach((v) => existing.vehicles.set(v.id, v.data));
    first.services.forEach((s) => existing.services.set(s.id, s.data));
    first.orders.forEach((o) => existing.orders.set(o.id, o.data));
    first.client_accounts.forEach((a) => existing.clientAccounts.set(a.id, a.data));
    existing.professions.add('ingeniera');
    existing.counter = 16;
    const again = buildPlan(exp, existing);
    for (const key of ['clients', 'vehicles', 'services', 'orders', 'professions', 'client_accounts'] as const) {
      expect(again[key].every((i) => i.kind === 'same')).toBe(true);
    }
    expect(again.counterTo).toBeNull();
  });
});
