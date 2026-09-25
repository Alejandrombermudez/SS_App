import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

const OWNER = 'alejucha@gmail.com';
const STAFF = 'mecanico@gmail.com';
const OTHER_ADMIN = 'jefe@gmail.com';
const STRANGER = 'curioso@gmail.com';

let env: RulesTestEnvironment;

function dbAs(email: string, verified = true): Firestore {
  return env.authenticatedContext(email.replace(/[^a-z]/g, ''), { email, email_verified: verified }).firestore() as unknown as Firestore;
}
const anon = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

function order(number: number, by: string, extra: Record<string, unknown> = {}) {
  return {
    number,
    status: 'Cotización',
    vehicle_plate: 'ABC12D',
    client_id: '1000',
    service_type: 'Especifico',
    entry_date: '2026-09-25',
    exit_date: '',
    km: 1200,
    initial_notes: '',
    final_notes: '',
    discount_pct: 10,
    services: [{ item_code: '8001', section: 'Motor', description: 'x', quantity: 1, price: 100000, total: 100000 }],
    parts: [],
    subtotal: 100000,
    discount: 10000,
    services_total: 90000,
    parts_total: 0,
    total: 90000,
    vehicle_category: 'BAJO',
    created_at: serverTimestamp(),
    created_by: by,
    updated_at: serverTimestamp(),
    updated_by: by,
    ...extra,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-ss-app',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', STAFF), { role: 'staff' });
    await setDoc(doc(db, 'users', OTHER_ADMIN), { role: 'admin' });
    await setDoc(doc(db, 'clients', '1000'), { name: 'Cliente', phone: '300', legacy_field: 42 });
    await setDoc(doc(db, 'vehicles', 'ABC12D'), { brand: 'Yamaha', client_id: '1000' });
    await setDoc(doc(db, 'services', '8001'), { item_code: '8001', price: 100000, cost_type: 'Fijo' });
    await setDoc(doc(db, 'counters', 'orders'), { last: 127 });
    await setDoc(doc(db, 'orders', '127'), { number: 127, created_by: OWNER });
  });
});

describe('acceso', () => {
  it('sin sesión no lee nada', async () => {
    await assertFails(getDoc(doc(anon(), 'clients', '1000')));
    await assertFails(getDoc(doc(anon(), 'orders', '127')));
  });

  it('una cuenta de Google cualquiera no lee datos del taller', async () => {
    const db = dbAs(STRANGER);
    await assertFails(getDoc(doc(db, 'clients', '1000')));
    await assertFails(getDoc(doc(db, 'services', '8001')));
    await assertFails(getDoc(doc(db, 'orders', '127')));
    await assertFails(setDoc(doc(db, 'clients', '2000'), { name: 'x' }));
  });

  it('una cuenta sin rol puede consultar su propio doc de users (para saber que no tiene acceso)', async () => {
    await assertSucceeds(getDoc(doc(dbAs(STRANGER), 'users', STRANGER)));
    await assertFails(getDoc(doc(dbAs(STRANGER), 'users', STAFF)));
  });

  it('el dueño con correo no verificado no entra', async () => {
    await assertFails(getDoc(doc(dbAs(OWNER, false), 'clients', '1000')));
  });

  it('dueño, admin y personal leen', async () => {
    for (const email of [OWNER, OTHER_ADMIN, STAFF]) {
      await assertSucceeds(getDoc(doc(dbAs(email), 'clients', '1000')));
      await assertSucceeds(getDoc(doc(dbAs(email), 'orders', '127')));
    }
  });
});

describe('personal (users)', () => {
  it('solo los admins agregan personal', async () => {
    await assertSucceeds(setDoc(doc(dbAs(OWNER), 'users', 'nuevo@gmail.com'), { role: 'staff' }));
    await assertSucceeds(setDoc(doc(dbAs(OTHER_ADMIN), 'users', 'otro@gmail.com'), { role: 'admin' }));
    await assertFails(setDoc(doc(dbAs(STAFF), 'users', 'amigo@gmail.com'), { role: 'staff' }));
  });

  it('el personal no puede subirse a admin', async () => {
    await assertFails(setDoc(doc(dbAs(STAFF), 'users', STAFF), { role: 'admin' }));
  });

  it('rechaza roles inventados y correos con mayúsculas', async () => {
    await assertFails(setDoc(doc(dbAs(OWNER), 'users', 'x@gmail.com'), { role: 'superuser' }));
    await assertFails(setDoc(doc(dbAs(OWNER), 'users', 'X@gmail.com'), { role: 'staff' }));
  });
});

describe('clientes y vehículos', () => {
  it('el personal crea y edita clientes', async () => {
    const db = dbAs(STAFF);
    await assertSucceeds(setDoc(doc(db, 'clients', '2000'), { name: 'Nuevo', phone: '301', instagram: '@x' }));
    await assertSucceeds(setDoc(doc(db, 'clients', '1000'), { phone: '302' }, { merge: true }));
  });

  it('no deja agregar campos desconocidos ni tipos incorrectos', async () => {
    const db = dbAs(STAFF);
    await assertFails(setDoc(doc(db, 'clients', '1000'), { is_admin: true }, { merge: true }));
    await assertFails(setDoc(doc(db, 'clients', '1000'), { phone: 300 }, { merge: true }));
  });

  it('solo los admins borran clientes y vehículos', async () => {
    await assertFails(deleteDoc(doc(dbAs(STAFF), 'clients', '1000')));
    await assertFails(deleteDoc(doc(dbAs(STAFF), 'vehicles', 'ABC12D')));
    await assertSucceeds(deleteDoc(doc(dbAs(OWNER), 'vehicles', 'ABC12D')));
  });

  it('valida la placa al crear y la categoría', async () => {
    const db = dbAs(STAFF);
    await assertSucceeds(setDoc(doc(db, 'vehicles', 'XYZ98A'), { brand: 'AKT', category: 'BAJO', client_id: '1000' }));
    await assertFails(setDoc(doc(db, 'vehicles', 'xyz 98a'), { brand: 'AKT' }));
    await assertFails(updateDoc(doc(db, 'vehicles', 'ABC12D'), { category: 'SUPER' }));
  });
});

describe('catálogo y configuración', () => {
  it('solo los admins cambian precios de servicios', async () => {
    await assertFails(updateDoc(doc(dbAs(STAFF), 'services', '8001'), { price: 1 }));
    await assertSucceeds(updateDoc(doc(dbAs(OWNER), 'services', '8001'), { price: 120000 }));
    await assertFails(updateDoc(doc(dbAs(OWNER), 'services', '8001'), { price: -5 }));
  });

  it('solo los admins cambian los datos de la factura', async () => {
    await assertSucceeds(getDoc(doc(dbAs(STAFF), 'settings', 'business')));
    await assertFails(setDoc(doc(dbAs(STAFF), 'settings', 'business'), { name: 'x' }));
    await assertSucceeds(setDoc(doc(dbAs(OWNER), 'settings', 'business'), { name: 'SS' }));
  });

  it('el personal agrega profesiones pero no las borra', async () => {
    await assertSucceeds(setDoc(doc(dbAs(STAFF), 'professions', 'p1'), { name: 'Ingeniero' }));
    await assertFails(deleteDoc(doc(dbAs(STAFF), 'professions', 'p1')));
  });
});

describe('misiones (órdenes y cotizaciones)', () => {
  async function createNext(db: Firestore, by: string, extra: Record<string, unknown> = {}) {
    return runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'counters', 'orders');
      const last = (await tx.get(counterRef)).data()!.last as number;
      const next = last + 1;
      tx.update(counterRef, { last: next });
      tx.set(doc(db, 'orders', String(next)), order(next, by, extra));
      return next;
    });
  }

  it('el personal crea la siguiente misión incrementando el contador', async () => {
    await assertSucceeds(createNext(dbAs(STAFF), STAFF));
  });

  it('el personal no puede crear un número sin mover el contador ni saltarse números', async () => {
    const db = dbAs(STAFF);
    await assertFails(setDoc(doc(db, 'orders', '128'), order(128, STAFF)));
    const batch = writeBatch(db);
    batch.update(doc(db, 'counters', 'orders'), { last: 130 });
    batch.set(doc(db, 'orders', '130'), order(130, STAFF));
    await assertFails(batch.commit());
  });

  it('nadie puede firmar como otra persona', async () => {
    await assertFails(createNext(dbAs(STAFF), OWNER));
  });

  it('una creación no puede pisar una misión existente', async () => {
    await assertFails(setDoc(doc(dbAs(STAFF), 'orders', '127'), order(127, STAFF)));
  });

  it('rechaza totales que no cuadran, estados y tipos inventados', async () => {
    await assertFails(createNext(dbAs(STAFF), STAFF, { total: 1 }));
    await assertFails(createNext(dbAs(STAFF), STAFF, { status: 'Pagada' }));
    await assertFails(createNext(dbAs(STAFF), STAFF, { service_type: 'Premium' }));
    await assertFails(createNext(dbAs(STAFF), STAFF, { discount_pct: 150 }));
  });

  it('el personal edita pero no cambia número ni autor, y no borra', async () => {
    const staff = dbAs(STAFF);
    const n = await createNext(staff, STAFF);
    const ref = doc(staff, 'orders', String(n));
    await assertSucceeds(updateDoc(ref, { status: 'Orden de Servicio', updated_by: STAFF, updated_at: serverTimestamp() }));
    await assertFails(updateDoc(ref, { number: 999, updated_by: STAFF, updated_at: serverTimestamp() }));
    await assertFails(updateDoc(ref, { created_by: OWNER, updated_by: STAFF, updated_at: serverTimestamp() }));
    await assertFails(deleteDoc(ref));
    // Otro miembro del personal puede seguir la misión, firmando con su propio correo.
    await assertSucceeds(updateDoc(doc(dbAs(OWNER), 'orders', String(n)), { km: 5000, updated_by: OWNER, updated_at: serverTimestamp() }));
  });

  it('los admins migran números arbitrarios y ajustan el contador', async () => {
    const db = dbAs(OWNER);
    await assertSucceeds(setDoc(doc(db, 'orders', '16'), order(16, OWNER, { source: 'access' })));
    await assertSucceeds(setDoc(doc(db, 'counters', 'orders'), { last: 200 }));
    await assertFails(setDoc(doc(dbAs(STAFF), 'counters', 'orders'), { last: 500 }));
  });

  it('el id del documento debe ser el número', async () => {
    await assertFails(setDoc(doc(dbAs(OWNER), 'orders', 'abc'), order(20, OWNER)));
  });
});
