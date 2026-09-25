import { computeTotals } from '../../utils/orderMath';

// Formato de DB/export/ssm-export.json (tools/access-export/export_access.py).
export interface AccessExport {
  exported_at: string;
  source: string;
  clients: Record<string, string>[];
  vehicles: Record<string, string>[];
  services: { item_code: string; section: string; description: string; cost_type: string; price: number; service_group: string }[];
  orders: AccessOrder[];
  professions: string[];
  warnings: string[];
}

export interface AccessOrder {
  number: number;
  status: string;
  vehicle_plate: string;
  client_id: string;
  service_type: string;
  entry_date: string;
  exit_date: string;
  km: number;
  initial_notes: string;
  final_notes: string;
  discount_pct: number;
  vehicle_category: string;
  services: { item_code: string; section: string; description: string; quantity: number; price: number; total: number }[];
  parts: { type: string; description: string; quantity: number; price: number; total: number }[];
  access_totals: { subtotal: number; discount: number; services_total: number; parts_total: number; total: number };
}

export type Kind = 'new' | 'update' | 'same' | 'conflict';

export interface PlanItem {
  id: string;
  label: string;
  kind: Kind;
  changes: string[]; // campos que cambian (en update)
  data: Record<string, unknown>; // lo que se escribe (merge)
  note?: string;
}

export type CollectionKey = 'clients' | 'vehicles' | 'services' | 'orders' | 'professions';

export interface ImportPlan {
  clients: PlanItem[];
  vehicles: PlanItem[];
  services: PlanItem[];
  orders: PlanItem[];
  professions: PlanItem[];
  counterTo: number | null; // nuevo valor de counters/orders, si hay que subirlo
  totalsFixed: { number: number; access: number; computed: number }[];
}

type Existing = Map<string, Record<string, unknown>>;

// Comparación independiente del orden de las claves (Firestore no conserva el orden de los mapas).
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? '');
}

const same = (a: unknown, b: unknown) => stable(a) === stable(b);

/**
 * Compara un registro de Access con el existente. Solo se tocan los campos que Access conoce y
 * nunca se borra un valor con uno vacío: lo que se haya agregado en la app (dirección, color,
 * dependencias, etc.) se conserva.
 */
function diff(id: string, label: string, access: Record<string, unknown>, existing: Record<string, unknown> | undefined, defaults: Record<string, unknown>): PlanItem {
  if (!existing) return { id, label, kind: 'new', changes: [], data: { ...defaults, ...access } };
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(access)) {
    if (v === '' || v === null || v === undefined) continue;
    if (!same(existing[k], v)) data[k] = v;
  }
  const changes = Object.keys(data);
  return { id, label, kind: changes.length ? 'update' : 'same', changes, data };
}

export function buildPlan(
  exp: AccessExport,
  existing: { clients: Existing; vehicles: Existing; services: Existing; orders: Existing; professions: Set<string>; counter: number },
): ImportPlan {
  const clients = exp.clients.map((c) => {
    const { id, ...fields } = c;
    return diff(id, fields.name || id, fields, existing.clients.get(id), { address: '', city: '' });
  });

  const vehicles = exp.vehicles.map((v) => {
    const { plate, ...fields } = v;
    const current = existing.vehicles.get(plate);
    // El kilometraje nunca baja: se queda el mayor entre la app y la última orden de Access.
    const km = Math.max(Number.parseInt(String(current?.km ?? ''), 10) || 0, Number.parseInt(fields.km, 10) || 0);
    return diff(plate, `${plate} · ${fields.brand} ${fields.line}`, { ...fields, km: km ? String(km) : '' }, current, {
      color: '',
      license_image: '',
    });
  });

  const services = exp.services.map((s) =>
    diff(s.item_code, `${s.item_code} · ${s.description}`, { ...s }, existing.services.get(s.item_code), { dependencies: [] }),
  );

  const totalsFixed: ImportPlan['totalsFixed'] = [];
  const orders = exp.orders.map((o): PlanItem => {
    const id = String(o.number);
    const t = computeTotals(o.services, o.parts, o.discount_pct);
    if (t.total !== o.access_totals.total) totalsFixed.push({ number: o.number, access: o.access_totals.total, computed: t.total });

    const data = {
      number: o.number,
      status: o.status,
      vehicle_plate: o.vehicle_plate,
      client_id: o.client_id,
      service_type: o.service_type,
      entry_date: o.entry_date,
      exit_date: o.exit_date,
      km: o.km,
      initial_notes: o.initial_notes,
      final_notes: o.final_notes,
      discount_pct: o.discount_pct,
      services: o.services,
      parts: o.parts,
      subtotal: t.subtotal,
      discount: t.discount,
      services_total: t.servicesTotal,
      parts_total: t.partsTotal,
      total: t.total,
      vehicle_category: o.vehicle_category,
      source: 'access',
    };
    const label = `Nº ${o.number} · ${o.vehicle_plate} · ${o.status}`;
    const current = existing.orders.get(id);
    if (!current) return { id, label, kind: 'new', changes: [], data };
    if (current.source !== 'access') {
      return { id, label, kind: 'conflict', changes: [], data, note: 'Ya existe una misión creada en la app con este número; no se toca.' };
    }
    const changes = Object.keys(data).filter((k) => !same(current[k], (data as Record<string, unknown>)[k]));
    return { id, label, kind: changes.length ? 'update' : 'same', changes, data };
  });

  const professions = exp.professions.map(
    (name): PlanItem => ({
      id: name,
      label: name,
      kind: existing.professions.has(name.trim().toLowerCase()) ? 'same' : 'new',
      changes: [],
      data: { name },
    }),
  );

  const maxNumber = Math.max(0, ...exp.orders.map((o) => o.number));
  return {
    clients,
    vehicles,
    services,
    orders,
    professions,
    counterTo: maxNumber > existing.counter ? maxNumber : null,
    totalsFixed,
  };
}

export function count(items: PlanItem[], kind: Kind): number {
  return items.filter((i) => i.kind === kind).length;
}

// ---------- Escrituras ----------

// Marcadores que quien ejecuta reemplaza por valores de su SDK (serverTimestamp / Timestamp).
// Así este módulo no depende de firebase y lo pueden usar la app y las pruebas del emulador.
export const SERVER_TIME = { __serverTimestamp: true } as const;
export const dateAt = (iso: string) => ({ __date: iso });

export interface WriteOp {
  collection: string;
  id: string | null; // null = id automático
  data: Record<string, unknown>;
  merge: boolean;
}

export const COLLECTION_LABELS: Record<CollectionKey, string> = {
  clients: 'Clientes',
  vehicles: 'Vehículos',
  services: 'Catálogo de servicios',
  orders: 'Misiones',
  professions: 'Profesiones',
};

/** Escrituras a realizar, agrupadas y en orden (primero clientes/motos, luego misiones y contador). */
export function planWrites(
  plan: ImportPlan,
  updateExisting: Record<CollectionKey, boolean>,
  email: string,
): [string, WriteOp[]][] {
  const groups: [string, WriteOp[]][] = [];

  for (const key of ['clients', 'vehicles', 'services'] as const) {
    const ops: WriteOp[] = [];
    for (const item of plan[key]) {
      if (item.kind === 'new') ops.push({ collection: key, id: item.id, data: item.data, merge: false });
      if (item.kind === 'update' && updateExisting[key]) ops.push({ collection: key, id: item.id, data: item.data, merge: true });
    }
    groups.push([COLLECTION_LABELS[key], ops]);
  }

  groups.push([
    COLLECTION_LABELS.professions,
    plan.professions.filter((p) => p.kind === 'new').map((p) => ({ collection: 'professions', id: null, data: p.data, merge: false })),
  ]);

  const orderOps: WriteOp[] = [];
  for (const item of plan.orders) {
    if (item.kind === 'new') {
      const entry = String(item.data.entry_date || '');
      orderOps.push({
        collection: 'orders',
        id: item.id,
        merge: false,
        data: {
          ...item.data,
          // Las misiones históricas quedan con su fecha de ingreso como fecha de creación.
          created_at: entry ? dateAt(entry) : SERVER_TIME,
          created_by: email,
          updated_at: SERVER_TIME,
          updated_by: email,
        },
      });
    } else if (item.kind === 'update' && updateExisting.orders) {
      orderOps.push({ collection: 'orders', id: item.id, merge: true, data: { ...item.data, updated_at: SERVER_TIME, updated_by: email } });
    }
  }
  groups.push([COLLECTION_LABELS.orders, orderOps]);

  if (plan.counterTo !== null) {
    groups.push(['Contador de misiones', [{ collection: 'counters', id: 'orders', data: { last: plan.counterTo }, merge: false }]]);
  }
  return groups;
}

/** Reemplaza los marcadores por los valores reales del SDK que ejecuta la escritura. */
export function materialize(
  data: Record<string, unknown>,
  sdk: { serverTimestamp: () => unknown; fromDate: (d: Date) => unknown },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && '__serverTimestamp' in v) out[k] = sdk.serverTimestamp();
    else if (v && typeof v === 'object' && '__date' in v) out[k] = sdk.fromDate(new Date(`${(v as { __date: string }).__date}T12:00:00`));
    else out[k] = v;
  }
  return out;
}
