import { doc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { orderToFirestore } from '../firestoreConverters';
import type { Order, ServiceType, Vehicle } from '../types';
import { computeTotals } from '../utils/orderMath';
import { todayIso } from '../utils/format';
import { calculateCategory } from '../utils/vehicleUtils';

const counterRef = () => doc(db, 'counters', 'orders');

/**
 * Crea una cotización nueva con el siguiente número consecutivo.
 * El contador y la misión se escriben en la misma transacción (las reglas lo exigen al personal),
 * así dos agentes creando a la vez nunca obtienen el mismo número.
 */
export async function createQuote(vehicle: Vehicle, userEmail: string, serviceType: ServiceType = 'Especifico'): Promise<number> {
  const km = Number.parseInt(vehicle.km, 10) || 0;
  return runTransaction(db, async (tx) => {
    const counter = await tx.get(counterRef());
    const last = counter.exists() ? Number(counter.data().last) || 0 : 0;
    const number = last + 1;
    const orderRef = doc(db, 'orders', String(number));
    if ((await tx.get(orderRef)).exists()) {
      throw new Error(`La misión ${number} ya existe. Pide a un administrador que revise el contador.`);
    }

    const totals = computeTotals([], [], 0);
    tx.set(counterRef(), { last: number });
    tx.set(orderRef, {
      number,
      status: 'Cotización',
      vehicle_plate: vehicle.plate,
      client_id: vehicle.clientId,
      service_type: serviceType,
      entry_date: todayIso(),
      exit_date: '',
      km,
      initial_notes: '',
      final_notes: '',
      discount_pct: 0,
      services: [],
      parts: [],
      subtotal: totals.subtotal,
      discount: totals.discount,
      services_total: totals.servicesTotal,
      parts_total: totals.partsTotal,
      total: totals.total,
      vehicle_category: vehicle.category || calculateCategory(vehicle.cc),
      created_at: serverTimestamp(),
      created_by: userEmail,
      updated_at: serverTimestamp(),
      updated_by: userEmail,
      source: 'app',
      deleted: false,
    });
    return number;
  });
}

/** Guarda la misión recalculando los totales desde sus líneas (nunca se confía en los guardados). */
export async function saveOrder(order: Order, userEmail: string): Promise<Order> {
  const services = order.services.map((l) => ({ ...l, total: Math.round(l.quantity * l.price) }));
  const parts = order.parts.map((l) => ({ ...l, total: Math.round(l.quantity * l.price) }));
  const totals = computeTotals(services, parts, order.discountPct);
  const next: Order = { ...order, services, parts, ...totals, updatedBy: userEmail };

  await setDoc(
    doc(db, 'orders', String(order.number)),
    { ...orderToFirestore(next), updated_at: serverTimestamp(), updated_by: userEmail },
    { merge: true },
  );
  return next;
}

/** "Elimina" una misión: queda en el historial y en el conteo, marcada con su razón (obligatoria). */
export async function discardOrder(number: number, reason: string, userEmail: string): Promise<void> {
  const clean = reason.trim();
  if (clean.length < 5) throw new Error('Escribe la razón (mínimo 5 caracteres).');
  await updateDoc(doc(db, 'orders', String(number)), {
    deleted: true,
    deleted_reason: clean,
    deleted_by: userEmail,
    deleted_at: serverTimestamp(),
    updated_by: userEmail,
    updated_at: serverTimestamp(),
  });
}

/** Reabre una misión eliminada. Conserva la razón anterior como registro. */
export async function reopenOrder(number: number, userEmail: string): Promise<void> {
  await updateDoc(doc(db, 'orders', String(number)), {
    deleted: false,
    updated_by: userEmail,
    updated_at: serverTimestamp(),
  });
}
