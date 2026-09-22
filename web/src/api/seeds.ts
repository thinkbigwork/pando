/** Wrappers tipados de las callables del semillero. */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export async function plantSeed(seedId: string, addToItemId?: string): Promise<string> {
  const res = await httpsCallable<{ seedId: string; addToItemId?: string }, { itemId: string }>(
    functions,
    'plantSeed',
  )({ seedId, addToItemId });
  return res.data.itemId;
}

export async function discardSeed(seedId: string): Promise<void> {
  await httpsCallable(functions, 'discardSeed')({ seedId });
}

export async function mergeSeeds(seedId: string, intoSeedId: string): Promise<void> {
  await httpsCallable(functions, 'mergeSeeds')({ seedId, intoSeedId });
}
