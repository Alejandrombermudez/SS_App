import type { BusinessSettings, Client, Order, OrderPartLine, OrderServiceLine, Vehicle } from '../../types';
import { computeTotals, groupBySection } from '../../utils/orderMath';
import { formatDate, formatNumber, formatOrderNumber, SERVICE_TYPE_LABELS } from '../../utils/format';

export type ExpiryState = 'ok' | 'soon' | 'expired' | 'unknown';

export interface InvoiceModel {
  number: string;
  isQuote: boolean;
  statusLabel: string;
  business: BusinessSettings;
  contactLine: string;
  client: { name: string; id: string; phone: string; email: string };
  vehicle: {
    plate: string;
    title: string;
    details: string;
    soat: { date: string; state: ExpiryState };
    tecno: { date: string; state: ExpiryState };
  };
  mission: { serviceType: string; entry: string; exit: string; km: string };
  initialNotes: string;
  finalNotes: string;
  serviceGroups: [string, OrderServiceLine[]][];
  parts: OrderPartLine[];
  discountPct: number;
  totals: ReturnType<typeof computeTotals>;
  validityNote: string;
  generatedOn: string;
  fileName: string;
}

/** Vigencia de SOAT / tecnomecánica respecto a la fecha del documento. */
function expiry(iso: string, reference: Date): ExpiryState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'unknown';
  const date = new Date(`${iso}T23:59:59`);
  const days = (date.getTime() - reference.getTime()) / 86_400_000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

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

  const contact = [
    business.legalId && `NIT ${business.legalId}`,
    business.phone && `Tel. ${business.phone}`,
    business.instagram,
    business.email,
  ].filter(Boolean);

  const details = vehicle
    ? [vehicle.cc && `${formatNumber(vehicle.cc)} cm³`, vehicle.category || order.vehicleCategory, vehicle.color]
        .filter(Boolean)
        .join(' · ')
    : '';

  return {
    number,
    isQuote,
    statusLabel: isQuote ? 'Cotización' : 'Orden de servicio',
    business,
    contactLine: contact.join('  ·  '),
    client: {
      name: client?.name || 'Cliente',
      id: order.clientId,
      phone: client?.phone ?? '',
      email: client?.email ?? '',
    },
    vehicle: {
      plate: order.vehiclePlate,
      title: vehicle ? [vehicle.brand, vehicle.line, vehicle.model].filter(Boolean).join(' ') : '',
      details,
      soat: { date: formatDate(vehicle?.soatDate ?? ''), state: expiry(vehicle?.soatDate ?? '', reference) },
      tecno: { date: formatDate(vehicle?.tecnoDate ?? ''), state: expiry(vehicle?.tecnoDate ?? '', reference) },
    },
    mission: {
      serviceType: SERVICE_TYPE_LABELS[order.serviceType] ?? order.serviceType,
      entry: formatDate(order.entryDate),
      exit: formatDate(order.exitDate),
      km: order.km ? `${formatNumber(order.km)} km` : '',
    },
    initialNotes: order.initialNotes.trim(),
    finalNotes: order.finalNotes.trim(),
    serviceGroups: groupBySection(order.services),
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
    fileName: `${isQuote ? 'Cotizacion' : 'Orden'}-Mision-${number}-${order.vehiclePlate}.pdf`,
  };
}

export const EXPIRY_LABEL: Record<ExpiryState, string> = {
  ok: 'vigente',
  soon: 'vence pronto',
  expired: 'vencido',
  unknown: '',
};
