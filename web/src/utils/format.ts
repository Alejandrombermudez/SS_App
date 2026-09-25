const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

/** $ 1.332.000 */
export function formatCOP(value: number): string {
  return cop.format(Math.round(value || 0));
}

export function formatNumber(value: number | string): string {
  const n = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(n) ? num.format(n) : '';
}

/** 'YYYY-MM-DD' -> '21/09/2026'. Vacío si no hay fecha. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

/** Fecha local de hoy en formato 'YYYY-MM-DD'. */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Número de misión con ceros: 105 -> '000105'. */
export function formatOrderNumber(n: number): string {
  return String(n).padStart(6, '0');
}

/** Normaliza una placa: sin espacios ni guiones, en mayúsculas. */
export function normalizePlate(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, '');
}

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  Especifico: 'Específico',
  Elemental: 'Elemental',
  Esencial: 'Esencial',
  General: 'General',
};
