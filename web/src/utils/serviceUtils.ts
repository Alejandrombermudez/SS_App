import type { Service } from '../types';

// Secciones del catálogo y el inicio de su rango de códigos: los nombres de Access (que manda en
// códigos y nombres) más "Servicios", que solo existe en la app. Ver catalogSync.ts.
export const SECTIONS_MAP: Record<string, number> = {
  'Admisión': 1000,
  'Carenado': 2000,
  'Chasis': 3000,
  'Controles': 4000,
  'Frenos': 5000,
  'Iluminación': 6000,
  'Instrumentos': 7000,
  'Motor': 8000,
  'Sis. Eléctrico': 9000,
  'Transmisión': 10000,
  'Tren Del.': 11000,
  'Tren Del./Tras.': 12000,
  'Tren Tras.': 13000,
  'General': 14000,
  'Servicios': 15000,
};

export const GROUP_OPTIONS = ['Especifico', 'Elemental', 'Esencial', 'General'];

/**
 * Calcula el siguiente código disponible para una sección.
 * Ej: si eliges "Motor" (8000) y el más alto existente es 8045, devuelve "8046".
 */
export function getNextCode(section: string, allServices: Service[]): string {
  const baseCode = SECTIONS_MAP[section];
  if (baseCode === undefined) return '';

  const rangeEnd = baseCode + 1000;

  const codesInSection = allServices
    .map((s) => Number.parseInt(s.itemCode, 10))
    .filter((code) => !Number.isNaN(code) && code >= baseCode && code < rangeEnd);

  if (codesInSection.length === 0) {
    return String(baseCode + 1);
  }

  return String(Math.max(...codesInSection) + 1);
}
