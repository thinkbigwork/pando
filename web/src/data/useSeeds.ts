/** Suscripción a las semillas pendientes (triage). Las reglas limitan la
 * lectura a los roles de triage o al autor. */

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Seed } from '@pando/shared';
import { db } from '../firebase';

export type SeedWithId = Seed & { id: string };

export function useSeeds(enabled = true): { seeds: SeedWithId[]; error: string | null } {
  const [seeds, setSeeds] = useState<SeedWithId[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      query(collection(db, 'seeds'), where('status', '==', 'pendiente')),
      (snap) => setSeeds(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Seed) }))),
      (e) => setError(e.message),
    );
  }, [enabled]);

  return { seeds, error };
}
