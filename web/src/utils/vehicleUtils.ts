import type { VehicleCategory } from '../types';

export function calculateCategory(ccStr: string): VehicleCategory {
  const cc = Number.parseInt(ccStr, 10) || 0;
  if (cc <= 200) return 'BAJO';
  if (cc <= 600) return 'MEDIO';
  return 'ALTO';
}

export const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  BAJO: { bg: '#4CAF50', text: '#000000' },
  MEDIO: { bg: '#FFC107', text: '#000000' },
  ALTO: { bg: '#F44336', text: '#000000' },
};

export function getCategoryColor(category: string): string {
  return CATEGORY_STYLES[category.toUpperCase()]?.bg ?? '#9CA3AF';
}

export type ExpiryState = 'ok' | 'soon' | 'expired' | 'unknown';

/** Vigencia de SOAT / tecnomecánica ('YYYY-MM-DD') respecto a una fecha; "pronto" = 30 días. */
export function expiryState(iso: string, reference: Date = new Date()): ExpiryState {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return 'unknown';
  const date = new Date(`${iso}T23:59:59`);
  const days = (date.getTime() - reference.getTime()) / 86_400_000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

export const EXPIRY_LABEL: Record<ExpiryState, string> = {
  ok: 'vigente',
  soon: 'vence pronto',
  expired: 'vencido',
  unknown: '',
};
