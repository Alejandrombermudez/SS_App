import type { BusinessSettings, Client, Order, OrderPartLine, OrderServiceLine, Vehicle } from '../../types';
import { computeTotals } from '../../utils/orderMath';
import { formatDate, formatOrderNumber, SERVICE_TYPE_LABELS } from '../../utils/format';
import { EXPIRY_LABEL, expiryState, type ExpiryState } from '../../utils/vehicleUtils';

export { EXPIRY_LABEL, type ExpiryState };

/**
 * Todo lo que muestra el Documento de Misión, ya formateado. Lo usan la vista HTML y el PDF,
 * así ambos muestran exactamente lo mismo. La estructura y el orden son los de la factura de
 * Access (informe 1_Clientes): datos del cliente, datos del objetivo (la moto), documento de
 * misión, detalles (servicios), recursos (repuestos) y costo total.
 */
export interface InvoiceModel {
  /** Número sin ceros: "85". */
  number: string;
  isQuote: boolean;
  /** "Cotización" | "Orden de Servicio" (campo "Tipo Doc"). */
  typeDoc: string;
  business: BusinessSettings;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    birth: string;
    phone: string;
    email: string;
    instagram: string;
    profession: string;
  };
  vehicle: {
    plate: string;
    brand: string;
    line: string;
    model: string;
    cc: string;
    soat: string;
    tecno: string;
    soatState: ExpiryState;
    tecnoState: ExpiryState;
  };
  mission: { km: string; service: string; entry: string };
  initialNotes: string;
  finalNotes: string;
  rows: OrderServiceLine[];
  parts: OrderPartLine[];
  discountPct: number;
  totals: ReturnType<typeof computeTotals>;
  validityNote: string;
  generatedOn: string;
  fileName: string;
}

/** Access guarda nombre y apellido por separado; si no están, se deducen del nombre completo. */
export function splitName(client: Pick<Client, 'name' | 'firstName' | 'lastName'> | null): [string, string] {
  if (!client) return ['', ''];
  if (client.firstName || client.lastName) return [client.firstName, client.lastName];
  const words = client.name.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [words[0] ?? '', ''];
  const cut = Math.ceil(words.length / 2);
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')];
}

export function buildInvoice(
  order: Order,
  client: Client | null,
  vehicle: Vehicle | null,
  business: BusinessSettings,
  now = new Date(),
  /** El cliente que mira no es quien pagó (moto comprada a otro): no se muestran sus datos. */
  maskClient = false,
): InvoiceModel {
  const isQuote = order.status === 'Cotización';
  // Vigencias respecto a la fecha de ingreso de la misión.
  const reference = order.entryDate ? new Date(`${order.entryDate}T12:00:00`) : now;
  const [firstName, lastName] = splitName(client);
  const p = (n: number) => String(n).padStart(2, '0');

  return {
    number: String(order.number),
    isQuote,
    typeDoc: isQuote ? 'Cotización' : 'Orden de Servicio',
    business,
    client: maskClient
      ? { id: '', firstName: 'Propietario', lastName: 'anterior', birth: '', phone: '', email: '', instagram: '', profession: '' }
      : {
          id: order.clientId,
          firstName,
          lastName,
          birth: formatDate(client?.birthDate ?? ''),
          phone: client?.phone ?? '',
          email: client?.email ?? '',
          instagram: client?.instagram ?? '',
          profession: client?.profession ?? '',
        },
    vehicle: {
      plate: order.vehiclePlate,
      brand: vehicle?.brand ?? '',
      line: vehicle?.line ?? '',
      model: vehicle?.model ?? '',
      cc: vehicle?.cc ?? '',
      soat: formatDate(vehicle?.soatDate ?? ''),
      tecno: formatDate(vehicle?.tecnoDate ?? ''),
      soatState: expiryState(vehicle?.soatDate ?? '', reference),
      tecnoState: expiryState(vehicle?.tecnoDate ?? '', reference),
    },
    mission: {
      km: order.km ? String(order.km) : '',
      service: SERVICE_TYPE_LABELS[order.serviceType] ?? order.serviceType,
      entry: formatDate(order.entryDate),
    },
    initialNotes: order.initialNotes.trim() || 'Sin Observaciones',
    finalNotes: order.finalNotes.trim() || 'Sin Observaciones',
    rows: [...order.services].sort((a, b) => (Number.parseInt(a.itemCode, 10) || 0) - (Number.parseInt(b.itemCode, 10) || 0)),
    parts: order.parts,
    discountPct: order.discountPct,
    totals: computeTotals(order.services, order.parts, order.discountPct),
    validityNote:
      isQuote && business.quoteValidityDays > 0
        ? `Cotización válida por ${business.quoteValidityDays} días a partir de la fecha de ingreso.`
        : '',
    generatedOn: formatDate(`${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`),
    fileName: `Mision-${formatOrderNumber(order.number)}-${order.vehiclePlate}.pdf`,
  };
}

/**
 * Paleta y medidas de la factura de Access (en puntos, página Carta 612 x 792, márgenes de 18).
 * Se midieron directamente sobre el PDF original.
 */
export const INVOICE = {
  color: {
    dark: '#262626',
    client: '#404040',
    objective: '#747474',
    docBar: '#D9D9D9',
    body: '#F2F2F2',
    blue: '#215F9A',
    blueLight: '#4E95D9',
    blueRow: '#DCEAF7',
    green: '#3B7D23',
    greenLight: '#4EA72E',
    greenRow: '#D9F2D0',
    text: '#404040',
    alert: '#B80828',
  },
  /** Columnas de la tabla de detalles/recursos (suman 571). */
  cols: { item: 39, section: 73, desc: 312, qty: 30, price: 57, total: 60 },
  contentWidth: 573,
};
