/**
 * Acciones del semillero (triage): plantar, descartar y fusionar semillas.
 * Callables que revalidan permisos en el servidor. Ver docs/02-arquitectura.md.
 */

import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { TRIAGE_ROLES, seedToItem, type Role, type Seed } from '@pando/shared';
import { REGION } from './config.js';

function requireTriage(req: CallableRequest): string {
  const role = req.auth?.token.role as string | undefined;
  if (!req.auth) throw new HttpsError('unauthenticated', 'Necesitás iniciar sesión.');
  if (!role || !TRIAGE_ROLES.includes(role as Role)) {
    throw new HttpsError('permission-denied', 'Tu rol no puede hacer triage del semillero.');
  }
  return req.auth.uid;
}

async function fallbackTrunk(db: Firestore): Promise<string> {
  const tax = await db.doc('config/taxonomy').get();
  const trunks = (tax.data()?.trunks as { name: string }[] | undefined) ?? [];
  return trunks[0]?.name ?? 'Sin línea';
}

/**
 * Planta una semilla: crea una hoja nueva (o la vincula a una existente) y marca
 * la semilla como plantada. Devuelve el id de la hoja.
 */
export const plantSeed = onCall({ region: REGION }, async (req) => {
  const uid = requireTriage(req);
  const seedId = String(req.data?.seedId ?? '');
  const addToItemId = req.data?.addToItemId ? String(req.data.addToItemId) : undefined;
  if (!seedId) throw new HttpsError('invalid-argument', 'Falta el seedId.');

  const db = getFirestore();
  const seedRef = db.doc(`seeds/${seedId}`);
  const seedSnap = await seedRef.get();
  if (!seedSnap.exists) throw new HttpsError('not-found', 'La semilla no existe.');
  const seed = seedSnap.data() as Seed;
  if (seed.status !== 'pendiente') {
    throw new HttpsError('failed-precondition', 'La semilla ya fue procesada.');
  }

  let itemId = addToItemId;
  if (!itemId) {
    const trunk = await fallbackTrunk(db);
    const itemData = seedToItem(seed, seedId, trunk);
    const ref = db.collection('items').doc();
    itemId = ref.id;
    await ref.set({
      ...itemData,
      order: Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: uid,
      updatedAt: new Date().toISOString(),
      updatedBy: uid,
    });
  }

  await seedRef.set({ status: 'plantada', plantedItemId: itemId }, { merge: true });
  await db.collection('auditLog').add({
    actor: { type: 'user', id: uid },
    action: addToItemId ? 'seed.plant.existing' : 'seed.plant.new',
    path: `seeds/${seedId}`,
    after: { itemId },
    at: FieldValue.serverTimestamp(),
  });
  logger.info('Semilla plantada', { seedId, itemId });
  return { itemId };
});

/** Descarta una semilla. */
export const discardSeed = onCall({ region: REGION }, async (req) => {
  const uid = requireTriage(req);
  const seedId = String(req.data?.seedId ?? '');
  if (!seedId) throw new HttpsError('invalid-argument', 'Falta el seedId.');
  const db = getFirestore();
  await db.doc(`seeds/${seedId}`).set({ status: 'descartada' }, { merge: true });
  await db.collection('auditLog').add({
    actor: { type: 'user', id: uid },
    action: 'seed.discard',
    path: `seeds/${seedId}`,
    at: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

/** Fusiona una semilla dentro de otra: completa los campos vacíos del destino y
 * marca el origen como fusionado. */
export const mergeSeeds = onCall({ region: REGION }, async (req) => {
  const uid = requireTriage(req);
  const seedId = String(req.data?.seedId ?? '');
  const intoSeedId = String(req.data?.intoSeedId ?? '');
  if (!seedId || !intoSeedId || seedId === intoSeedId) {
    throw new HttpsError('invalid-argument', 'Semillas inválidas para fusionar.');
  }
  const db = getFirestore();
  const [a, b] = await Promise.all([
    db.doc(`seeds/${seedId}`).get(),
    db.doc(`seeds/${intoSeedId}`).get(),
  ]);
  if (!a.exists || !b.exists) throw new HttpsError('not-found', 'Alguna semilla no existe.');

  const src = (a.data() as Seed).extracted ?? {};
  const dst = (b.data() as Seed).extracted ?? {};
  const merged: Record<string, unknown> = { ...dst };
  for (const [k, v] of Object.entries(src)) {
    if ((merged[k] === undefined || merged[k] === '' || merged[k] === null) && v !== undefined) {
      merged[k] = v;
    }
  }

  await db.doc(`seeds/${intoSeedId}`).set({ extracted: merged }, { merge: true });
  await db
    .doc(`seeds/${seedId}`)
    .set({ status: 'fusionada', plantedItemId: intoSeedId }, { merge: true });
  await db.collection('auditLog').add({
    actor: { type: 'user', id: uid },
    action: 'seed.merge',
    path: `seeds/${seedId}`,
    after: { intoSeedId },
    at: FieldValue.serverTimestamp(),
  });
  return { ok: true };
});
