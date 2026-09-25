import type { OrderPartLine, OrderServiceLine, OrderTotals, Service } from '../types';

// Reglas de precios heredadas de la base Access (formulario 3_Ordenes, botón AgregarServicios):
// un servicio de costo "Fijo" cuesta el precio del catálogo; uno "Variable" se multiplica
// según la categoría de la moto.
export const CATEGORY_MULTIPLIER: Record<string, number> = { BAJO: 1, MEDIO: 2, ALTO: 3 };

export function isVariable(costType: string): boolean {
  return costType.trim().toLowerCase() === 'variable';
}

/** Precio unitario de un servicio del catálogo para una moto de cierta categoría. */
export function priceForCategory(service: Pick<Service, 'costType' | 'price'>, category: string): number {
  if (!isVariable(service.costType)) return service.price;
  const multiplier = CATEGORY_MULTIPLIER[category.toUpperCase()];
  if (multiplier === undefined) {
    throw new Error(`Categoría de vehículo "${category}" no válida (usa BAJO, MEDIO o ALTO)`);
  }
  return service.price * multiplier;
}

export function lineTotal(quantity: number, price: number): number {
  return Math.round((Number(quantity) || 0) * (Number(price) || 0));
}

export function serviceLineFromCatalog(service: Service, category: string): OrderServiceLine {
  const price = priceForCategory(service, category);
  return {
    itemCode: service.itemCode,
    section: service.section,
    description: service.description,
    quantity: 1,
    price,
    total: price,
  };
}

/**
 * Totales de una misión (botón "LQOrden" de Access, verificado contra las 102 órdenes):
 * el descuento aplica solo a los servicios; los recursos (repuestos) se suman sin descuento.
 */
export function computeTotals(
  services: Pick<OrderServiceLine, 'quantity' | 'price'>[],
  parts: Pick<OrderPartLine, 'quantity' | 'price'>[],
  discountPct: number,
): OrderTotals {
  const subtotal = services.reduce((sum, l) => sum + lineTotal(l.quantity, l.price), 0);
  const pct = Math.min(Math.max(Number(discountPct) || 0, 0), 100);
  const discount = Math.round((subtotal * pct) / 100);
  const servicesTotal = subtotal - discount;
  const partsTotal = parts.reduce((sum, l) => sum + lineTotal(l.quantity, l.price), 0);
  return { subtotal, discount, servicesTotal, partsTotal, total: servicesTotal + partsTotal };
}

/** Ordena las líneas de servicio por sección (en el orden del catálogo) y luego por código. */
export function groupBySection<T extends { section: string; itemCode: string }>(lines: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const list = groups.get(line.section) ?? [];
    list.push(line);
    groups.set(line.section, list);
  }
  const firstCode = (list: T[]) => Math.min(...list.map((l) => Number.parseInt(l.itemCode, 10) || 0));
  return [...groups.entries()].sort((a, b) => firstCode(a[1]) - firstCode(b[1]));
}
