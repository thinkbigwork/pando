/** Suscripción genérica a una subcolección de una hoja (comentarios, reuniones).
 * Devuelve [] ante error (p.ej. modo muestra sin backend). */

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';

export function useSubcollection<T>(itemId: string | null, name: string): T[] {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => {
    setRows([]);
    if (!itemId) return;
    try {
      return onSnapshot(
        query(collection(db, 'items', itemId, name)),
        (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T)),
        () => setRows([]),
      );
    } catch {
      setRows([]);
      return;
    }
  }, [itemId, name]);
  return rows;
}
