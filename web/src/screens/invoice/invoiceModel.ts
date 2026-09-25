import type { BusinessSettings, Client, Order, OrderPartLine, OrderServiceLine, Vehicle } from '../../types';
import { computeTotals, groupBySection } from '../../utils/orderMath';
import { formatDate, formatNumber, formatOrderNumber, SERVICE_TYPE_LABELS } from '../../utils/format';

import { EXPIRY_LABEL, expiryState, type ExpiryState } from '../../utils/vehicleUtils';

export { EXPIRY_LABEL, type ExpiryState };

export interface Field {
  label: string;
  value: string;
}

export interface ServiceRow extends OrderServiceLine {
  /** Primera línea de su sección: se dibuja un separador y se muestra el nombre de la sección. */
  firstOfSection: boolean;
}

/**
 * Todo lo que muestra el Documento de Misión, ya formateado. Lo usan la vista HTML y el PDF,
 * así ambos muestran exactamente lo mismo. Estructura tomada de la factura de Access
 * (informe 1_Clientes): datos del cliente, datos del objetivo (la moto), documento de misión,
 * detalles (servicios), recursos (repuestos) y costo total.
 */
export interface InvoiceModel {
  number: string;
  isQuote: boolean;
  statusLabel: string;
  business: BusinessSettings;
  contactLine: string;
  client: { name: string; fields: Field[] };
  vehicle: {
    plate: string;
    title: string; // HONDA CB300F 2024
    details: string; // 293 cm³ · MEDIO · Negro
    soat: { date: string; state: ExpiryState };
    tecno: { date: string; state: ExpiryState };
  };
  mission: Field[];
  initialNotes: string;
  finalNotes: string;
  serviceRows: ServiceRow[];
  serviceCount: number;
  parts: OrderPartLine[];
  discountPct: number;
  totals: ReturnType<typeof computeTotals>;
  validityNote: string;
  generatedOn: string;
  fileName: string;
}

// Vigencias calculadas respecto a la fecha de ingreso de la misión.
const expiry = expiryState;

const present = (fields: Field[]) => fields.filter((f) => f.value);

export function buildInvoice(
  order: Order,
  client: Client | null,
  vehicle: Vehicle | null,
  business: BusinessSettings,
  now = new Date(),
): InvoiceModel {
  const isQuote = order.status === 'Cotización';
  const reference = order.entryDate ? new Date(`${order.entryDate}T12:00:00`) : now;
  const number = formatOrderNumber(order.number);

  const contactLine = [
    business.phone,
    business.instagram,
    business.email,
    business.legalId && `NIT ${business.legalId}`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return {
    number,
    isQuote,
    statusLabel: isQuote ? 'Cotización' : 'Orden de servicio',
    business,
    contactLine,
    client: {
      name: client?.name || 'Cliente',
      fields: present([
        { label: 'Cédula', value: order.clientId },
        { label: 'Teléfono', value: client?.phone ?? '' },
        { label: 'Correo', value: client?.email ?? '' },
        { label: 'Instagram', value: client?.instagram ?? '' },
        { label: 'Nacimiento', value: formatDate(client?.birthDate ?? '') },
        { label: 'Profesión', value: client?.profession ?? '' },
      ]),
    },
    vehicle: {
      plate: order.vehiclePlate,
      title: [vehicle?.brand, vehicle?.line, vehicle?.model].filter(Boolean).join(' '),
      details: [
        vehicle?.cc ? `${formatNumber(vehicle.cc)} cm³` : '',
        vehicle?.category || order.vehicleCategory,
        vehicle?.color ?? '',
      ]
        .filter(Boolean)
        .join(' · '),
      soat: { date: formatDate(vehicle?.soatDate ?? ''), state: expiry(vehicle?.soatDate ?? '', reference) },
      tecno: { date: formatDate(vehicle?.tecnoDate ?? ''), state: expiry(vehicle?.tecnoDate ?? '', reference) },
    },
    mission: present([
      { label: 'Tipo', value: isQuote ? 'Cotización' : 'Orden de servicio' },
      { label: 'Servicio', value: SERVICE_TYPE_LABELS[order.serviceType] ?? order.serviceType },
      { label: 'Kilometraje', value: order.km ? `${formatNumber(order.km)} km` : '' },
      { label: 'Ingreso', value: formatDate(order.entryDate) },
      { label: 'Salida', value: formatDate(order.exitDate) },
    ]),
    initialNotes: order.initialNotes.trim(),
    finalNotes: order.finalNotes.trim(),
    serviceRows: groupBySection(order.services).flatMap(([, lines]) =>
      lines.map((l, i) => ({ ...l, firstOfSection: i === 0 })),
    ),
    serviceCount: order.services.length,
    parts: order.parts,
    discountPct: order.discountPct,
    totals: computeTotals(order.services, order.parts, order.discountPct),
    validityNote:
      isQuote && business.quoteValidityDays > 0
        ? `Cotización válida por ${business.quoteValidityDays} días a partir de la fecha de ingreso.`
        : '',
    generatedOn: formatDate(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    ),
    fileName: `Mision-${number}-${order.vehiclePlate}.pdf`,
  };
}


// Colores del documento: rojo de marca; azul para servicios y verde para recursos,
// como en la factura de Access, en tonos más sobrios.
export const INVOICE_COLORS = {
  red: '#B80828',
  ink: '#171717',
  services: '#1F4E8C',
  servicesTint: '#EEF3FA',
  parts: '#3D7A28',
  partsTint: '#EFF6EC',
};
