import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import {
  businessFromData,
  clientConverter,
  orderFromData,
  serviceConverter,
  vehicleConverter,
} from '../firestoreConverters';
import type { BusinessSettings, Client, Order, Service, Vehicle } from '../types';

export interface Loadable<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

function describe(err: unknown): string {
  const code = (err as { code?: string })?.code;
  return code === 'permission-denied' ? 'No tienes permiso para ver esta información.' : 'No se pudo cargar la información.';
}

/** Documento en tiempo real. `null` si no existe. */
function useLiveDoc<T>(path: string | null, map: (id: string, data: Record<string, any>) => T): Loadable<T | null> {
  const [state, setState] = useState<Loadable<T | null>>({ data: null, loading: !!path, error: null });
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      doc(db, path),
      (snap) => setState({ data: snap.exists() ? map(snap.id, snap.data()) : null, loading: false, error: null }),
      (err) => setState({ data: null, loading: false, error: describe(err) }),
    );
    // `map` es estable (funciones de módulo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  return state;
}

export function useOrder(number: number | null) {
  return useLiveDoc(number ? `orders/${number}` : null, orderFromData);
}

export function useVehicle(plate: string | null) {
  return useLiveDoc(plate ? `vehicles/${plate}` : null, (id, data) =>
    vehicleConverter.fromFirestore({ id, data: () => data } as never),
  );
}

export function useClient(id: string | null) {
  return useLiveDoc(id ? `clients/${id}` : null, (cid, data) =>
    clientConverter.fromFirestore({ id: cid, data: () => data } as never),
  );
}

export function useBusinessSettings(): Loadable<BusinessSettings> {
  const s = useLiveDoc('settings/business', (_id, data) => businessFromData(data));
  return { ...s, data: s.data ?? businessFromData(undefined) };
}

export function useServices(): Loadable<Service[]> {
  const [state, setState] = useState<Loadable<Service[]>>({ data: [], loading: true, error: null });
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, 'services'), orderBy('item_code')).withConverter(serviceConverter),
        (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
        (err) => setState({ data: [], loading: false, error: describe(err) }),
      ),
    [],
  );
  return state;
}

export function useClients(): Loadable<Client[]> {
  const [state, setState] = useState<Loadable<Client[]>>({ data: [], loading: true, error: null });
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'clients').withConverter(clientConverter),
        (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
        (err) => setState({ data: [], loading: false, error: describe(err) }),
      ),
    [],
  );
  return state;
}

/** Misiones filtradas por un campo (placa o cliente), de la más reciente a la más antigua. */
export function useOrdersWhere(field: 'vehicle_plate' | 'client_id', value: string | null): Loadable<Order[]> {
  const [state, setState] = useState<Loadable<Order[]>>({ data: [], loading: !!value, error: null });
  useEffect(() => {
    if (!value) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    // Se ordena en el cliente para no necesitar un índice compuesto.
    return onSnapshot(
      query(collection(db, 'orders'), where(field, '==', value)),
      (snap) =>
        setState({
          data: snap.docs.map((d) => orderFromData(d.id, d.data())).sort((a, b) => b.number - a.number),
          loading: false,
          error: null,
        }),
      (err) => setState({ data: [], loading: false, error: describe(err) }),
    );
  }, [field, value]);
  return state;
}

export function useVehiclesOf(clientId: string | null): Loadable<Vehicle[]> {
  const [state, setState] = useState<Loadable<Vehicle[]>>({ data: [], loading: !!clientId, error: null });
  useEffect(() => {
    if (!clientId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    return onSnapshot(
      query(collection(db, 'vehicles'), where('client_id', '==', clientId)).withConverter(vehicleConverter),
      (snap) => setState({ data: snap.docs.map((d) => d.data()), loading: false, error: null }),
      (err) => setState({ data: [], loading: false, error: describe(err) }),
    );
  }, [clientId]);
  return state;
}
