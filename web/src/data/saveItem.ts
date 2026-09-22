/** Escrituras a `items` desde el cliente. Las reglas revalidan cada cambio
 * (campos por rol, sellado con updatedBy). Ver firestore.rules. */

import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import type { Item, Step } from '@pando/shared';
import { db } from '../firebase';

function nowIso(): string {
  return new Date().toISOString();
}

/** Guarda un parche de campos de la hoja, sellando updatedBy/updatedAt. */
export async function saveItem(id: string, patch: Partial<Item>, uid: string): Promise<void> {
  await updateDoc(doc(db, 'items', id), { ...patch, updatedBy: uid, updatedAt: nowIso() });
}

/** Marca/desmarca un paso (permiso markAssignedSteps). Cambia solo `steps`. */
export async function saveSteps(id: string, steps: Step[], uid: string): Promise<void> {
  await updateDoc(doc(db, 'items', id), { steps, updatedBy: uid, updatedAt: nowIso() });
}

/** Agrega un comentario a la actividad (subcolección). */
export async function addComment(itemId: string, uid: string, text: string): Promise<void> {
  await addDoc(collection(db, 'items', itemId, 'comments'), {
    by: uid,
    text,
    at: nowIso(),
    via: 'app',
  });
}
