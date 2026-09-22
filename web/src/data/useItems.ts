/** Suscripción en vivo a la colección `items` (solo roles internos por reglas). */

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import type { ItemWithId } from '../tree/model';

export interface ItemsState {
  items: ItemWithId[];
  loading: boolean;
  error: string | null;
}

export function useItems(): ItemsState {
  const [state, setState] = useState<ItemsState>({ items: [], loading: true, error: null });

  useEffect(() => {
    return onSnapshot(
      collection(db, 'items'),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as ItemWithId);
        setState({ items, loading: false, error: null });
      },
      (e) => setState({ items: [], loading: false, error: e.message }),
    );
  }, []);

  return state;
}
