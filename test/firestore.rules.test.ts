/**
 * Tests de reglas de Firestore contra el emulador.
 * Sprint 0: se cubren los invariantes críticos de acceso. El Sprint 1 agrega
 * un test por cada fila de la matriz de docs/01-producto.md.
 *
 * Se corre con el emulador arriba:
 *   npm run test:rules
 * (usa `firebase emulators:exec --only firestore`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const rulesPath = resolve(here, '../firestore.rules');

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'pando-rules-test',
    firestore: { rules: readFileSync(rulesPath, 'utf8') },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Datos base escritos con permisos elevados (bypass de reglas).
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'items/abbott'), { title: 'Abbott', ownerUids: [] });
    await setDoc(doc(db, 'public/summary'), { totals: {} });
  });
});

/** Contexto autenticado con un custom claim de rol. */
function asRole(uid: string, role: string | null) {
  const claims = role ? { role } : {};
  return testEnv.authenticatedContext(uid, claims).firestore();
}

describe('reglas de Firestore — invariantes de acceso (Sprint 0)', () => {
  it('un usuario sin sesión no puede leer items', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'items/abbott')));
  });

  it('un visitante NO puede leer items', async () => {
    const db = asRole('visita', 'visitante');
    await assertFails(getDoc(doc(db, 'items/abbott')));
  });

  it('un visitante SÍ puede leer public/summary', async () => {
    const db = asRole('visita', 'visitante');
    await assertSucceeds(getDoc(doc(db, 'public/summary')));
  });

  it('un rol interno (vendedor) puede leer items', async () => {
    const db = asRole('vende', 'vendedor');
    await assertSucceeds(getDoc(doc(db, 'items/abbott')));
  });

  it('un rol pendiente no puede leer items ni el resumen', async () => {
    const db = asRole('nuevo', 'pendiente');
    await assertFails(getDoc(doc(db, 'items/abbott')));
    await assertFails(getDoc(doc(db, 'public/summary')));
  });

  it('nadie puede escribir public/summary desde el cliente', async () => {
    const db = asRole('jefe', 'ceo');
    await assertFails(setDoc(doc(db, 'public/summary'), { totals: { hacked: true } }));
  });
});
