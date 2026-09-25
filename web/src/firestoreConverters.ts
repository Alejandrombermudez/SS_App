import { Timestamp, type FirestoreDataConverter, type QueryDocumentSnapshot } from 'firebase/firestore';
import {
  DEFAULT_BUSINESS,
  type BusinessSettings,
  type Client,
  type Order,
  type OrderPartLine,
  type OrderServiceLine,
  type Service,
  type Vehicle,
} from './types';

export const clientConverter: FirestoreDataConverter<Client> = {
  toFirestore(client: Client) {
    return {
      name: client.name,
      phone: client.phone,
      email: client.email,
      address: client.address,
      city: client.city,
      profession: client.profession,
      instagram: client.instagram,
      birth_date: client.birthDate,
      gender: client.gender,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Client {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      address: data.address ?? '',
      city: data.city ?? '',
      profession: data.profession ?? '',
      instagram: data.instagram ?? '',
      birthDate: data.birth_date ?? '',
      gender: data.gender ?? '',
    };
  },
};

export const serviceConverter: FirestoreDataConverter<Service> = {
  toFirestore(service: Service) {
    return {
      item_code: service.itemCode,
      section: service.section,
      description: service.description,
      cost_type: service.costType,
      price: service.price,
      service_group: service.serviceGroup,
      dependencies: service.dependencies,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Service {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      itemCode: data.item_code ?? '',
      section: data.section ?? '',
      description: data.description ?? '',
      costType: data.cost_type ?? '',
      price: data.price ?? 0,
      serviceGroup: data.service_group ?? '',
      dependencies: data.dependencies ?? [],
    };
  },
};

export const vehicleConverter: FirestoreDataConverter<Vehicle> = {
  toFirestore(vehicle: Vehicle) {
    const { plate: _plate, ...rest } = vehicle;
    return {
      brand: rest.brand,
      line: rest.line,
      model: rest.model,
      color: rest.color,
      cc: rest.cc,
      category: rest.category,
      km: rest.km,
      soat_date: rest.soatDate,
      tecno_date: rest.tecnoDate,
      client_id: rest.clientId,
      license_image: rest.licenseImage,
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Vehicle {
    const data = snapshot.data();
    return {
      plate: snapshot.id,
      brand: data.brand ?? '',
      line: data.line ?? '',
      model: data.model ?? '',
      color: data.color ?? '',
      cc: data.cc ?? '',
      category: data.category ?? '',
      km: data.km ?? '',
      soatDate: data.soat_date ?? '',
      tecnoDate: data.tecno_date ?? '',
      clientId: data.client_id ?? '',
      licenseImage: data.license_image ?? '',
    };
  },
};

// ---------- Misiones ----------

export function serviceLineToFirestore(l: OrderServiceLine) {
  return {
    item_code: l.itemCode,
    section: l.section,
    description: l.description,
    quantity: l.quantity,
    price: l.price,
    total: l.total,
  };
}

export function partLineToFirestore(l: OrderPartLine) {
  return { type: l.type, description: l.description, quantity: l.quantity, price: l.price, total: l.total };
}

function toDate(v: unknown): Date | null {
  return v instanceof Timestamp ? v.toDate() : null;
}

export function orderFromData(id: string, data: Record<string, any>): Order {
  return {
    number: data.number ?? Number(id),
    status: data.status ?? 'Cotización',
    vehiclePlate: data.vehicle_plate ?? '',
    clientId: data.client_id ?? '',
    serviceType: data.service_type ?? 'Especifico',
    entryDate: data.entry_date ?? '',
    exitDate: data.exit_date ?? '',
    km: data.km ?? 0,
    initialNotes: data.initial_notes ?? '',
    finalNotes: data.final_notes ?? '',
    discountPct: data.discount_pct ?? 0,
    services: (data.services ?? []).map((l: Record<string, any>) => ({
      itemCode: String(l.item_code ?? ''),
      section: l.section ?? '',
      description: l.description ?? '',
      quantity: l.quantity ?? 1,
      price: l.price ?? 0,
      total: l.total ?? 0,
    })),
    parts: (data.parts ?? []).map((l: Record<string, any>) => ({
      type: l.type ?? 'Repuesto',
      description: l.description ?? '',
      quantity: l.quantity ?? 1,
      price: l.price ?? 0,
      total: l.total ?? 0,
    })),
    subtotal: data.subtotal ?? 0,
    discount: data.discount ?? 0,
    servicesTotal: data.services_total ?? 0,
    partsTotal: data.parts_total ?? 0,
    total: data.total ?? 0,
    vehicleCategory: data.vehicle_category ?? '',
    createdBy: data.created_by ?? '',
    updatedBy: data.updated_by ?? '',
    createdAt: toDate(data.created_at),
    updatedAt: toDate(data.updated_at),
    source: data.source ?? '',
  };
}

/** Campos editables de una misión (sin fechas de auditoría, que pone orderRepo). */
export function orderToFirestore(o: Order) {
  return {
    number: o.number,
    status: o.status,
    vehicle_plate: o.vehiclePlate,
    client_id: o.clientId,
    service_type: o.serviceType,
    entry_date: o.entryDate,
    exit_date: o.exitDate,
    km: o.km,
    initial_notes: o.initialNotes,
    final_notes: o.finalNotes,
    discount_pct: o.discountPct,
    services: o.services.map(serviceLineToFirestore),
    parts: o.parts.map(partLineToFirestore),
    subtotal: o.subtotal,
    discount: o.discount,
    services_total: o.servicesTotal,
    parts_total: o.partsTotal,
    total: o.total,
    vehicle_category: o.vehicleCategory,
  };
}

export function businessFromData(data: Record<string, any> | undefined): BusinessSettings {
  return { ...DEFAULT_BUSINESS, ...(data ?? {}) };
}
