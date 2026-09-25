export interface Client {
  id: string; // Cédula / NIT — es también el ID del documento en Firestore
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  profession: string;
  instagram: string;
  birthDate: string; // YYYY-MM-DD
  gender: string;
}

export const emptyClient = (): Client => ({
  id: '',
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  profession: '',
  instagram: '',
  birthDate: '',
  gender: '',
});

export const GENDER_OPTIONS = ['MASCULINO', 'FEMENINO', 'Sin Definir'];

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

// 'client': cliente del taller (su correo está en client_accounts/): solo ve su portal.
// 'none': inició sesión con Google pero no es personal ni cliente enlazado.
export type UserRole = 'admin' | 'staff' | 'client' | 'none';

export interface StaffUser {
  email: string; // también es el ID del documento, en minúsculas
  role: 'admin' | 'staff';
  name: string;
}

// ---------- Misiones: cotizaciones y órdenes de servicio ----------

export const ORDER_STATUSES = ['Cotización', 'Orden de Servicio'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Mismas claves que GROUP_OPTIONS del catálogo (así filtra por grupo de servicio).
export type ServiceType = 'Especifico' | 'Elemental' | 'Esencial' | 'General';

export const PART_TYPES = ['Repuesto', 'Consumible', 'Insumo', 'Accesorio', 'Herramienta', 'Servicio', 'Otro'];

export interface OrderServiceLine {
  itemCode: string;
  section: string;
  description: string;
  quantity: number;
  price: number; // precio unitario ya ajustado por categoría
  total: number;
}

export interface OrderPartLine {
  type: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
}

export interface OrderTotals {
  subtotal: number; // suma de servicios
  discount: number; // solo sobre servicios
  servicesTotal: number;
  partsTotal: number;
  total: number;
}

export interface Order extends OrderTotals {
  number: number; // también es el ID del documento
  status: OrderStatus;
  vehiclePlate: string;
  clientId: string;
  serviceType: ServiceType;
  entryDate: string; // YYYY-MM-DD
  exitDate: string; // YYYY-MM-DD o ''
  km: number;
  initialNotes: string;
  finalNotes: string;
  discountPct: number;
  services: OrderServiceLine[];
  parts: OrderPartLine[];
  vehicleCategory: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  source: string; // 'access' para el historial migrado
}

export interface BusinessSettings {
  name: string;
  legalId: string; // NIT / cédula
  phone: string;
  email: string;
  address: string;
  city: string;
  instagram: string;
  website: string;
  discountNote: string;
  quoteValidityDays: number;
  footerNote: string;
}

// Valores tomados de la factura actual (MISION Nº85.pdf); se editan en Configuración.
export const DEFAULT_BUSINESS: BusinessSettings = {
  name: 'Servicio Secreto Motorcycles',
  legalId: '',
  phone: '+57 302 612 8712',
  email: '',
  address: '',
  city: '',
  instagram: '',
  website: '',
  discountNote: 'No aplica para transferencias, Nequi, Daviplata o Bre-B.',
  quoteValidityDays: 0,
  footerNote: '',
};
