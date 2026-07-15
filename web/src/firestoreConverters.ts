import type { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';
import type { Client, Service, Vehicle } from './types';

export const clientConverter: FirestoreDataConverter<Client> = {
  toFirestore(client: Client) {
    const { id: _id, ...data } = client;
    return data;
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
