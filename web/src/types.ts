export interface Client {
  id: string; // Cédula / NIT — es también el ID del documento en Firestore
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  profession: string;
}

export const emptyClient = (): Client => ({
  id: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  profession: '',
});

export interface Service {
  id: string; // = item_code, también es el ID del documento
  itemCode: string;
  section: string;
  description: string;
  costType: string; // "Fijo" | "Variable"
  price: number;
  serviceGroup: string; // grupos unidos por "/", ej. "Elemental/General"
  dependencies: string[]; // item_codes de servicios dependientes
}

export const emptyService = (): Service => ({
  id: '',
  itemCode: '',
  section: '',
  description: '',
  costType: 'Fijo',
  price: 0,
  serviceGroup: '',
  dependencies: [],
});

export type VehicleCategory = 'BAJO' | 'MEDIO' | 'ALTO';

export interface Vehicle {
  plate: string; // también es el ID del documento
  brand: string;
  line: string;
  model: string;
  color: string;
  cc: string;
  category: string;
  km: string;
  soatDate: string;
  tecnoDate: string;
  clientId: string;
  licenseImage: string;
}

export const emptyVehicle = (clientId: string): Vehicle => ({
  plate: '',
  brand: '',
  line: '',
  model: '',
  color: '',
  cc: '',
  category: '',
  km: '',
  soatDate: '',
  tecnoDate: '',
  clientId,
  licenseImage: '',
});

export type UserRole = 'admin' | 'user';
