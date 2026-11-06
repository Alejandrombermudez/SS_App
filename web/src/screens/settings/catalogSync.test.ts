import { describe, expect, it } from 'vitest';
import { planCatalog, type AccessService } from './catalogSync';

const svc = (item_code: string, section: string, description: string, price = 10000): AccessService => ({
  item_code,
  section,
  description,
  cost_type: 'Fijo',
  price,
  service_group: 'Especifico',
});

const access = [
  svc('5001', 'Frenos', 'Revisión/Cambio Sensor de Presión'),
  svc('5002', 'Frenos', 'Ajuste de Recorrido Pedal'),
  svc('9001', 'Sis. Eléctrico', 'Comprobación Regulador'),
];

const app = (entries: [string, Record<string, unknown>][]) => new Map(entries);

describe('planCatalog: Access manda en códigos y nombres', () => {
  it('un código igual con el mismo servicio solo actualiza lo distinto y conserva dependencias', () => {
    const items = planCatalog(access, app([['5002', { item_code: '5002', section: 'Frenos', description: 'Ajuste de recorrido pedal', price: 9000, dependencies: ['5001'] }]]));
    const it5002 = items.find((i) => i.id === '5002')!;
    expect(it5002.kind).toBe('update');
    expect(it5002.data).toMatchObject({ description: 'Ajuste de Recorrido Pedal', price: 10000, dependencies: ['5001'] });
  });

  it('el mismo servicio con otro código se mueve al de Access y borra el viejo', () => {
    const items = planCatalog(access, app([['5009', { item_code: '5009', section: 'Frenos', description: 'Revisión/Cambio Sensor de Presión', dependencies: ['5002'] }]]));
    expect(items.find((i) => i.id === '5001')).toMatchObject({ kind: 'new', data: { dependencies: ['5002'] } });
    expect(items.find((i) => i.id === '5009')).toMatchObject({ kind: 'delete' });
  });

  it('un servicio de la app en un código que Access usa para otro se corre al siguiente libre', () => {
    const items = planCatalog(access, app([['5001', { item_code: '5001', section: 'Frenos', description: 'Revisión/Cambio Bandas', price: 20000 }]]));
    expect(items.find((i) => i.id === '5001')).toMatchObject({ data: { description: 'Revisión/Cambio Sensor de Presión' } });
    // 5002 lo usa Access: el siguiente libre es 5003.
    expect(items.find((i) => i.id === '5003')).toMatchObject({ kind: 'new', data: { description: 'Revisión/Cambio Bandas', price: 20000, item_code: '5003' } });
  });

  it('los servicios solo de la app se conservan con la sección renombrada como en Access', () => {
    const items = planCatalog(access, app([['9016', { item_code: '9016', section: 'Sistema Eléctrico', description: 'Instalación de alarma' }]]));
    const item = items.find((i) => i.id === '9016')!;
    expect(item).toMatchObject({ kind: 'update', data: { section: 'Sis. Eléctrico', description: 'Instalación de alarma' } });
    expect(item.changes).toContain('section');
  });

  it('las dependencias se re-apuntan a los códigos nuevos', () => {
    const items = planCatalog(
      access,
      app([
        ['5001', { item_code: '5001', section: 'Frenos', description: 'Revisión/Cambio Bandas' }],
        ['9016', { item_code: '9016', section: 'Sistema Eléctrico', description: 'Alarma', dependencies: ['5001'] }],
      ]),
    );
    expect(items.find((i) => i.id === '9016')!.data.dependencies).toEqual(['5003']);
  });

  it('no copia campos que no permiten las reglas (el "id" que guardaba la app Android)', () => {
    const items = planCatalog(access, app([['5001', { id: 'x', item_code: '5001', section: 'Frenos', description: 'Revisión/Cambio Bandas' }], ['9016', { id: 'y', item_code: '9016', section: 'Sistema Eléctrico', description: 'Alarma' }]]));
    for (const i of items) expect(Object.keys(i.data)).not.toContain('id');
  });

  it('modo idéntico a Access: quita lo que solo existe en la app y no reubica nada', () => {
    const items = planCatalog(
      access,
      app([
        ['5001', { item_code: '5001', section: 'Frenos', description: 'Revisión/Cambio Bandas' }],
        ['9016', { item_code: '9016', section: 'Sistema Eléctrico', description: 'Alarma' }],
        ['5009', { item_code: '5009', section: 'Frenos', description: 'Ajuste de Recorrido Pedal', dependencies: ['9016'] }],
      ]),
      true,
    );
    expect(items.find((i) => i.id === '9016')).toMatchObject({ kind: 'delete' });
    expect(items.find((i) => i.id === '5009')).toMatchObject({ kind: 'delete' });
    expect(items.some((i) => i.id === '5003')).toBe(false);
    expect(items.filter((i) => i.kind !== 'delete').map((i) => i.id).sort()).toEqual(['5001', '5002', '9001']);
    // La dependencia apuntaba a un servicio que se quita: no queda colgando.
    expect(items.find((i) => i.id === '5002')!.data.dependencies).toEqual([]);
  });

  it('una segunda sincronización no cambia nada', () => {
    const first = planCatalog(access, app([['5001', { item_code: '5001', section: 'Frenos', description: 'Revisión/Cambio Bandas' }]]));
    const after = new Map(first.filter((i) => i.kind !== 'delete').map((i) => [i.id, i.data]));
    expect(planCatalog(access, after).every((i) => i.kind === 'same')).toBe(true);
  });
});
