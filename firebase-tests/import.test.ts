import { existsSync, readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { buildPlan, materialize, planWrites, type AccessExport, type CollectionKey } from '../web/src/screens/settings/importPlan';

// Importa la exportación REAL de Access en el emulador, con las reglas de producción y como el
// dueño, igual que la pantalla "Importar historial". Solo corre si existe el archivo local
// (DB/ no se versiona: tiene datos de clientes).
const EXPORT = 'DB/export/ssm-export.json';
const OWNER = 'alejucha@gmail.com';
const STAFF = 'mecanico@gmail.com';
const UPDATE_ALL: Record<CollectionKey, boolean> = { clients: true, vehicles: true, services: true, orders: true, professions: true };

let env: RulesTestEnvironment;
const as = (email: string) =>
  env.authenticatedContext(email.replace(/[^a-z]/g, ''), { email, email_verified: true }).firestore() as unknown as Firestore;

async function readExisting(db: Firestore) {
  const [clients, vehicles, services, orders, professions, counter] = await Promise.all([
    getDocs(collection(db, 'clients')),
    getDocs(collection(db, 'vehicles')),
    getDocs(collection(db, 'services')),
    getDocs(collection(db, 'orders')),
    getDocs(collection(db, 'professions')),
    getDoc(doc(db, 'counters', 'orders')),
  ]);
  const toMap = (s: typeof clients) => new Map(s.docs.map((d) => [d.id, d.data()]));
  return {
    clients: toMap(clients),
    vehicles: toMap(vehicles),
    services: toMap(services),
    orders: toMap(orders),
    professions: new Set(professions.docs.map((d) => String(d.data().name).trim().toLowerCase())),
    counter: Number(counter.data()?.last) || 0,
  };
}

describe.runIf(existsSync(EXPORT))('migración real de Access con las reglas de producción', () => {
  const exp = JSON.parse(readFileSync(EXPORT, 'utf8')) as AccessExport;

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: 'demo-ss-app-import',
      firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    });
    await env.clearFirestore();
    // Datos que ya existían en Firestore desde la app Android (campos heredados incluidos).
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      const c = exp.clients[0];
      await setDoc(doc(db, 'clients', c.id), { name: 'Nombre viejo', phone: '', email: '', address: 'Calle 1', city: 'Bogotá', profession: '', legacy: true });
      const s = exp.services[0];
      await setDoc(doc(db, 'services', s.item_code), { item_code: s.item_code, section: s.section, description: 'x', cost_type: s.cost_type, price: 1, service_group: s.service_group, dependencies: ['1002'] });
      await setDoc(doc(db, 'users', STAFF), { role: 'staff' });
    });
  });

  afterAll(async () => {
    await env?.cleanup();
  });

  it('el dueño importa todo sin que las reglas rechacen nada', async () => {
    const db = as(OWNER);
    const plan = buildPlan(exp, await readExisting(db));
    const sdk = { serverTimestamp, fromDate: (d: Date) => Timestamp.fromDate(d) };
    let written = 0;
    for (const [, ops] of planWrites(plan, UPDATE_ALL, OWNER)) {
      for (let i = 0; i < ops.length; i += 400) {
        const batch = writeBatch(db);
        for (const op of ops.slice(i, i + 400)) {
          const ref = op.id ? doc(db, op.collection, op.id) : doc(collection(db, op.collection));
          batch.set(ref, materialize(op.data, sdk), { merge: op.merge });
        }
        await batch.commit();
        written += Math.min(400, ops.length - i);
      }
    }
    expect(written).toBeGreaterThan(exp.orders.length);

    const after = await readExisting(db);
    expect(after.orders.size).toBe(exp.orders.length);
    expect(after.clients.size).toBe(exp.clients.length);
    expect(after.counter).toBe(Math.max(...exp.orders.map((o) => o.number)));
    // Se conservan los datos que solo existían en la app.
    expect(after.clients.get(exp.clients[0].id)).toMatchObject({ address: 'Calle 1', city: 'Bogotá', legacy: true });
    expect(after.services.get(exp.services[0].item_code)).toMatchObject({ dependencies: ['1002'], price: exp.services[0].price });
  });

  it('los totales guardados cuadran con las líneas en todas las misiones', async () => {
    const orders = (await readExisting(as(OWNER))).orders;
    for (const o of orders.values()) {
      const sub = (o.services as { quantity: number; price: number }[]).reduce((s, l) => s + l.quantity * l.price, 0);
      const parts = (o.parts as { quantity: number; price: number }[]).reduce((s, l) => s + l.quantity * l.price, 0);
      expect(o.subtotal).toBe(sub);
      expect(o.parts_total).toBe(parts);
      expect(o.total).toBe(sub - (o.discount as number) + parts);
    }
  });

  it('una segunda importación no encuentra nada por cambiar', async () => {
    const db = as(OWNER);
    const again = buildPlan(exp, await readExisting(db));
    for (const key of ['clients', 'vehicles', 'services', 'orders', 'professions'] as const) {
      const pending = again[key].filter((i) => i.kind !== 'same').map((i) => `${i.id}:${i.changes.join('|')}`);
      expect(pending, key).toEqual([]);
    }
    expect(again.counterTo).toBeNull();
  });

  it('después de migrar, un agente crea la siguiente misión con número consecutivo', async () => {
    const db = as(STAFF);
    const next = await runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'counters', 'orders');
      const last = (await tx.get(counterRef)).data()!.last as number;
      const n = last + 1;
      tx.update(counterRef, { last: n });
      tx.set(doc(db, 'orders', String(n)), {
        number: n, status: 'Cotización', vehicle_plate: exp.vehicles[0].plate, client_id: exp.vehicles[0].client_id,
        service_type: 'Especifico', entry_date: '2026-09-25', exit_date: '', km: 0, initial_notes: '', final_notes: '',
        discount_pct: 0, services: [], parts: [], subtotal: 0, discount: 0, services_total: 0, parts_total: 0, total: 0,
        vehicle_category: 'BAJO', created_at: serverTimestamp(), created_by: STAFF, updated_at: serverTimestamp(),
        updated_by: STAFF, source: 'app',
      });
      return n;
    });
    expect(next).toBe(Math.max(...exp.orders.map((o) => o.number)) + 1);
  });
});
