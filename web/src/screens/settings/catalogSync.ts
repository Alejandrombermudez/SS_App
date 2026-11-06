import type { PlanItem } from './importPlan';

// Sincronización del catálogo de servicios con Access. Regla: ACCESS MANDA en códigos y nombres.
//  1. Cada código de Access queda con los datos de Access (sección, descripción, tipo, precio, grupo).
//  2. Si el mismo servicio (misma descripción) estaba en la app con otro código, se mueve al
//     código de Access y conserva sus dependencias; el código viejo se borra si no lo usa Access.
//  3. Un servicio que solo existe en la app y ocupa un código que en Access es de OTRO servicio se
//     corre al siguiente código libre de su sección (no se pierde: queda para usar después).
//  4. Los servicios que solo existen en la app y no chocan se conservan; su sección se renombra
//     como en Access según el rango del código.
//  5. Las dependencias se re-apuntan a los códigos nuevos.

export interface AccessService {
  item_code: string;
  section: string;
  description: string;
  cost_type: string;
  price: number;
  service_group: string;
}

type Doc = Record<string, unknown>;

/** Nombre de sección de Access por rango de código (mil). Debe coincidir con SECTIONS_MAP. */
export const ACCESS_SECTIONS: Record<number, string> = {
  1000: 'Admisión',
  2000: 'Carenado',
  3000: 'Chasis',
  4000: 'Controles',
  5000: 'Frenos',
  6000: 'Iluminación',
  7000: 'Instrumentos',
  8000: 'Motor',
  9000: 'Sis. Eléctrico',
  10000: 'Transmisión',
  11000: 'Tren Del.',
  12000: 'Tren Del./Tras.',
  13000: 'Tren Tras.',
  14000: 'General',
  15000: 'Servicios',
};

export const normDesc = (t: unknown) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Solo los campos que permiten las reglas (la app Android guardaba además un campo "id").
const FIELDS = ['item_code', 'section', 'description', 'cost_type', 'price', 'service_group', 'dependencies'];
const pick = (doc: Doc): Doc => Object.fromEntries(FIELDS.filter((k) => k in doc).map((k) => [k, doc[k]]));

const rangeOf = (code: string) => Math.floor((Number.parseInt(code, 10) || 0) / 1000) * 1000;

const stable = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(stable).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${k}:${stable((v as Doc)[k])}`)
          .join(',')}}`
      : JSON.stringify(v ?? '');

/**
 * @param exact true = el catálogo queda IDÉNTICO a Access: lo que solo existe en la app se quita
 *   (ningún historial depende del catálogo: cada línea de misión guarda su propia copia).
 */
export function planCatalog(access: AccessService[], existing: Map<string, Doc>, exact = false): PlanItem[] {
  const accessCodes = new Set(access.map((s) => s.item_code));
  const accessByDesc = new Map(access.map((s) => [normDesc(s.description), s.item_code]));

  // Dónde termina cada documento de la app: código destino (o null si se fusiona con Access).
  const remap = new Map<string, string>(); // código viejo -> código nuevo
  const depsFor = new Map<string, string[]>(); // código Access -> dependencias heredadas de la app
  const relocated: { from: string; to: string; doc: Doc }[] = [];
  const keptAppOnly: { code: string; doc: Doc }[] = [];

  const used = new Set<string>([...accessCodes]);

  // Primero los que coinciden por descripción (se mueven o se quedan donde Access dice).
  const pending: [string, Doc][] = [];
  for (const [code, doc] of existing) {
    const target = accessByDesc.get(normDesc(doc.description));
    if (target) {
      remap.set(code, target);
      const deps = Array.isArray(doc.dependencies) ? (doc.dependencies as string[]) : [];
      if (deps.length || !depsFor.has(target)) depsFor.set(target, [...(depsFor.get(target) ?? []), ...deps]);
    } else {
      pending.push([code, doc]);
    }
  }
  for (const [code] of pending) if (!accessCodes.has(code)) used.add(code);

  // Luego los que solo existen en la app.
  for (const [code, doc] of pending.sort((a, b) => Number(a[0]) - Number(b[0]))) {
    if (!accessCodes.has(code)) {
      keptAppOnly.push({ code, doc });
      remap.set(code, code);
      continue;
    }
    // Choca con un código de Access de otro servicio: siguiente libre de su sección.
    const base = rangeOf(code);
    let next = Number(code) + 1;
    while (used.has(String(next)) && next < base + 999) next++;
    const to = String(next);
    used.add(to);
    remap.set(code, to);
    relocated.push({ from: code, to, doc });
  }

  const fixDeps = (deps: unknown): string[] => {
    const list = Array.isArray(deps) ? (deps as string[]) : [];
    // En modo idéntico solo sobreviven dependencias hacia servicios de Access.
    return [...new Set(list.map((d) => remap.get(d) ?? d))].filter((d) => (exact ? accessCodes : used).has(d));
  };

  const items: PlanItem[] = [];
  const push = (id: string, label: string, data: Doc, note?: string) => {
    const current = existing.get(id);
    if (!current) {
      items.push({ id, label, kind: 'new', changes: [], data, note });
      return;
    }
    const changes = Object.keys(data).filter((k) => stable(current[k]) !== stable(data[k]));
    items.push({ id, label, kind: changes.length ? 'update' : 'same', changes, data, note });
  };

  for (const s of access) {
    const data: Doc = {
      item_code: s.item_code,
      section: s.section,
      description: s.description,
      cost_type: s.cost_type,
      price: s.price,
      service_group: s.service_group,
      // Solo se heredan dependencias del MISMO servicio (misma descripción), no del que ocupaba el código.
      dependencies: fixDeps(depsFor.get(s.item_code) ?? []),
    };
    // Si en la app ese código era de otro servicio, ese otro se reubicó: los datos de Access se
    // escriben completos (no es un "cambio" del mismo servicio).
    const moved = relocated.find((r) => r.from === s.item_code);
    push(s.item_code, `${s.item_code} · ${s.description}`, data, moved ? `El servicio de la app que estaba aquí pasa al ${moved.to}` : undefined);
  }

  if (exact) {
    // Los que solo existen en la app: se quitan (los reubicados ni se crean; su código viejo ya
    // lo ocupa el servicio de Access).
    for (const { code, doc } of keptAppOnly) {
      items.push({ id: code, label: `${code} · ${doc.description}`, kind: 'delete', changes: [], data: {}, note: 'No existe en Access' });
    }
    for (const [code, to] of remap) {
      if (to !== code && !accessCodes.has(code)) {
        items.push({ id: code, label: `${code} · ${existing.get(code)!.description}`, kind: 'delete', changes: [], data: {}, note: `Pasa al código ${to} de Access` });
      }
    }
    return items;
  }

  for (const { code, doc } of keptAppOnly) {
    const section = ACCESS_SECTIONS[rangeOf(code)] ?? String(doc.section ?? '');
    push(code, `${code} · ${doc.description}`, { ...pick(doc), item_code: code, section, dependencies: fixDeps(doc.dependencies) }, 'Solo existe en la app: se conserva');
  }

  for (const { from, to, doc } of relocated) {
    const section = ACCESS_SECTIONS[rangeOf(to)] ?? String(doc.section ?? '');
    items.push({
      id: to,
      label: `${to} · ${doc.description}`,
      kind: 'new',
      changes: [],
      data: { ...pick(doc), item_code: to, section, dependencies: fixDeps(doc.dependencies) },
      note: `Reubicado desde el ${from} (ese código es de otro servicio en Access)`,
    });
  }

  // Códigos viejos que quedan vacíos: el servicio se movió a su código de Access.
  for (const [code, to] of remap) {
    if (to !== code && !accessCodes.has(code)) {
      const doc = existing.get(code)!;
      items.push({ id: code, label: `${code} · ${doc.description}`, kind: 'delete', changes: [], data: {}, note: `Pasa al código ${to} de Access` });
    }
  }

  return items;
}
