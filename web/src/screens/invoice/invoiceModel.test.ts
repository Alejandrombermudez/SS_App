import { describe, expect, it } from 'vitest';
import { splitName } from './invoiceModel';

describe('splitName', () => {
  it('usa nombre y apellido de Access cuando existen', () => {
    expect(splitName({ name: 'LEIDY JOHANNA LANCHEROS MARTINEZ', firstName: 'LEIDY JOHANNA', lastName: 'LANCHEROS MARTINEZ' })).toEqual([
      'LEIDY JOHANNA',
      'LANCHEROS MARTINEZ',
    ]);
  });

  it('si faltan, deduce nombre y apellido repartiendo las palabras', () => {
    expect(splitName({ name: 'ALEJANDRO BERMUDEZ', firstName: '', lastName: '' })).toEqual(['ALEJANDRO', 'BERMUDEZ']);
    expect(splitName({ name: 'MILLER JAIRO PEÑA MORENO', firstName: '', lastName: '' })).toEqual(['MILLER JAIRO', 'PEÑA MORENO']);
    expect(splitName({ name: 'SANTIAGO', firstName: '', lastName: '' })).toEqual(['SANTIAGO', '']);
    expect(splitName(null)).toEqual(['', '']);
  });
});
