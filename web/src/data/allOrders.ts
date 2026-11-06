import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { orderFromData } from '../firestoreConverters';
import type { Order } from '../types';

/** Todas las misiones (incluidas las eliminadas), de la más reciente a la más antigua. Solo personal. */
export function useAllOrders(): { data: Order[]; loading: boolean; error: string | null } {
  const [state, setState] = useState<{ data: Order[]; loading: boolean; error: string | null }>({ data: [], loading: true, error: null });
  useEffect(
    () =>
      onSnapshot(
        collection(db, 'orders'),
        (snap) =>
          setState({
            data: snap.docs.map((d) => orderFromData(d.id, d.data())).sort((a, b) => b.number - a.number),
            loading: false,
            error: null,
          }),
        () => setState({ data: [], loading: false, error: 'No se pudieron cargar las misiones.' }),
      ),
    [],
  );
  return state;
}
