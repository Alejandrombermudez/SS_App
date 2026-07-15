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
