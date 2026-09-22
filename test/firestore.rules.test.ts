/**
 * Tests de reglas de Firestore contra el emulador — un caso por cada fila
 * enforceable de la matriz de permisos (docs/01-producto.md).
 *
 * Nota: "Ver montos por hoja" es un permiso a nivel de CAMPO en la lectura y no
 * se puede imponer con reglas de Firestore (las reglas son por documento, no por
 * campo en lecturas). Ese ocultamiento vive en la UI y en el resumen del
 * visitante; acá se cubre todo lo que sí es enforceable por reglas.
 *
 * Se corre con el emulador: `npm run test:rules`.
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
import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const here = dirname(fileURLToPath(import.meta.url));
const rulesPath = resolve(here, '../firestore.rules');

let testEnv: RulesTestEnvironment;

/** Firestore autenticado con un custom claim de rol. */
function as(uid: string, role: string) {
  return testEnv.authenticatedContext(uid, { role }).firestore();
}
const anon = () => testEnv.unauthenticatedContext().firestore();

const INTERNAL = ['ceo', 'cofounder', 'chief', 'pm', 'vendedor', 'colaborador', 'advisor'];
const CREATORS = ['ceo', 'cofounder', 'chief', 'pm', 'vendedor'];
const EDITORS_ALL = ['ceo', 'cofounder', 'chief', 'pm'];
const ADMINS = ['ceo', 'cofounder'];
const TRIAGE = ['ceo', 'cofounder', 'chief', 'pm', 'vendedor'];

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
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'items/abbott'), {
      title: 'Abbott',
      stage: 'propuesta',
      ownerUids: ['u_vendedor'],
      steps: [{ id: 's1', done: false }],
      archived: false,
      visibleToVisitors: true,
      updatedBy: 'seed',
      createdBy: 'seed',
    });
    await setDoc(doc(db, 'items/foreign'), {
      title: 'Ajena',
      ownerUids: ['u_other'],
      steps: [],
      updatedBy: 'seed',
    });
    await setDoc(doc(db, 'items/abbott/comments/c1'), { by: 'u_pm', text: 'hola' });
    await setDoc(doc(db, 'seeds/mine'), { capturedBy: 'u_advisor', status: 'pendiente' });
    await setDoc(doc(db, 'seeds/theirs'), { capturedBy: 'u_other', status: 'pendiente' });
    await setDoc(doc(db, 'suggestions/g1'), { status: 'nueva', text: 'x' });
    await setDoc(doc(db, 'config/taxonomy'), { trunks: [] });
    await setDoc(doc(db, 'public/summary'), { totals: {} });
    await setDoc(doc(db, 'users/u_vendedor'), {
      role: 'vendedor',
      email: 'v@wizor.io',
      displayName: 'Vendedora',
    });
    await setDoc(doc(db, 'users/u_other'), { role: 'pm', email: 'o@wizor.io' });
    await setDoc(doc(db, 'users/u_ceo/contacts/k1'), { name: 'Contacto', visibility: 'privado' });
    await setDoc(doc(db, 'invites/inv@ext.com'), { email: 'inv@ext.com', role: 'advisor' });
  });
});

describe('items — lectura', () => {
  it('cada rol interno puede leer', async () => {
    for (const role of INTERNAL) {
      await assertSucceeds(getDoc(doc(as(`u_${role}`, role), 'items/abbott')));
    }
  });
  it('visitante, pendiente y anónimo no pueden leer', async () => {
    await assertFails(getDoc(doc(as('u_v', 'visitante'), 'items/abbott')));
    await assertFails(getDoc(doc(as('u_p', 'pendiente'), 'items/abbott')));
    await assertFails(getDoc(doc(anon(), 'items/abbott')));
  });
});

describe('items — crear hojas', () => {
  it('los roles creadores pueden crear con createdBy propio', async () => {
    for (const role of CREATORS) {
      await assertSucceeds(
        setDoc(doc(as(`u_${role}`, role), `items/new_${role}`), {
          title: 'N',
          createdBy: `u_${role}`,
        }),
      );
    }
  });
  it('colaborador, advisor y visitante no pueden crear', async () => {
    for (const role of ['colaborador', 'advisor', 'visitante']) {
      await assertFails(
        setDoc(doc(as(`u_${role}`, role), `items/new_${role}`), {
          title: 'N',
          createdBy: `u_${role}`,
        }),
      );
    }
  });
  it('no se puede crear con createdBy ajeno', async () => {
    await assertFails(
      setDoc(doc(as('u_pm', 'pm'), 'items/new'), { title: 'N', createdBy: 'otro' }),
    );
  });
});

describe('items — editar', () => {
  it('editores plenos editan cualquier hoja (con updatedBy propio)', async () => {
    for (const role of EDITORS_ALL) {
      await assertSucceeds(
        updateDoc(doc(as(`u_${role}`, role), 'items/foreign'), {
          title: 'Editada',
          updatedBy: `u_${role}`,
        }),
      );
    }
  });
  it('sin sellar (updatedBy != uid) se rechaza incluso al CEO', async () => {
    await assertFails(updateDoc(doc(as('u_ceo', 'ceo'), 'items/abbott'), { title: 'Z' }));
  });
  it('vendedor edita su hoja pero no una ajena', async () => {
    await assertSucceeds(
      updateDoc(doc(as('u_vendedor', 'vendedor'), 'items/abbott'), {
        nextStep: 'y',
        updatedBy: 'u_vendedor',
      }),
    );
    await assertFails(
      updateDoc(doc(as('u_vendedor', 'vendedor'), 'items/foreign'), {
        title: 'x',
        updatedBy: 'u_vendedor',
      }),
    );
  });
  it('colaborador solo cambia pasos, no otros campos', async () => {
    await assertSucceeds(
      updateDoc(doc(as('u_colab', 'colaborador'), 'items/abbott'), {
        steps: [{ id: 's1', done: true }],
        updatedAt: '2026-01-01',
        updatedBy: 'u_colab',
      }),
    );
    await assertFails(
      updateDoc(doc(as('u_colab', 'colaborador'), 'items/abbott'), {
        title: 'no',
        updatedBy: 'u_colab',
      }),
    );
  });
  it('advisor no puede editar hojas', async () => {
    await assertFails(
      updateDoc(doc(as('u_adv', 'advisor'), 'items/abbott'), {
        title: 'x',
        updatedBy: 'u_adv',
      }),
    );
  });
});

describe('items — eliminar', () => {
  it('solo CEO y cofounder eliminan', async () => {
    for (const role of ADMINS) {
      await assertSucceeds(deleteDoc(doc(as(`u_${role}`, role), 'items/foreign')));
    }
  });
  it('chief, pm y vendedor no eliminan', async () => {
    for (const role of ['chief', 'pm', 'vendedor']) {
      await assertFails(deleteDoc(doc(as(`u_${role}`, role), 'items/abbott')));
    }
  });
});

describe('comentarios', () => {
  it('interno comenta con by propio; con by ajeno falla', async () => {
    await assertSucceeds(
      addDoc(collection(as('u_pm', 'pm'), 'items/abbott/comments'), { by: 'u_pm', text: 'ok' }),
    );
    await assertFails(
      addDoc(collection(as('u_pm', 'pm'), 'items/abbott/comments'), { by: 'otro', text: 'no' }),
    );
  });
  it('visitante no comenta', async () => {
    await assertFails(
      addDoc(collection(as('u_v', 'visitante'), 'items/abbott/comments'), {
        by: 'u_v',
        text: 'no',
      }),
    );
  });
});

describe('seeds — captura y triage', () => {
  it('interno crea semilla propia pendiente', async () => {
    await assertSucceeds(
      setDoc(doc(as('u_adv', 'advisor'), 'seeds/n1'), {
        capturedBy: 'u_adv',
        status: 'pendiente',
      }),
    );
  });
  it('no se crea con estado distinto de pendiente ni con capturedBy ajeno', async () => {
    await assertFails(
      setDoc(doc(as('u_adv', 'advisor'), 'seeds/n2'), {
        capturedBy: 'u_adv',
        status: 'plantada',
      }),
    );
    await assertFails(
      setDoc(doc(as('u_adv', 'advisor'), 'seeds/n3'), {
        capturedBy: 'otro',
        status: 'pendiente',
      }),
    );
  });
  it('visitante no captura', async () => {
    await assertFails(
      setDoc(doc(as('u_v', 'visitante'), 'seeds/n4'), {
        capturedBy: 'u_v',
        status: 'pendiente',
      }),
    );
  });
  it('lecturas: triage lee todo; el autor lee la suya; ajeno y visitante no', async () => {
    await assertSucceeds(getDoc(doc(as('u_pm', 'pm'), 'seeds/theirs')));
    await assertSucceeds(getDoc(doc(as('u_advisor', 'advisor'), 'seeds/mine')));
    await assertFails(getDoc(doc(as('u_advisor', 'advisor'), 'seeds/theirs')));
    await assertFails(getDoc(doc(as('u_v', 'visitante'), 'seeds/mine')));
  });
  it('actualizar: triage sí, advisor no; borrar: solo admins', async () => {
    await assertSucceeds(updateDoc(doc(as('u_pm', 'pm'), 'seeds/mine'), { status: 'descartada' }));
    await assertFails(updateDoc(doc(as('u_adv', 'advisor'), 'seeds/mine'), { status: 'x' }));
    await assertSucceeds(deleteDoc(doc(as('u_ceo', 'ceo'), 'seeds/theirs')));
    await assertFails(deleteDoc(doc(as('u_pm', 'pm'), 'seeds/mine')));
  });

  it('los triage cubren exactamente estos roles', async () => {
    for (const role of INTERNAL) {
      const call = getDoc(doc(as(`u_${role}`, role), 'seeds/theirs'));
      if (TRIAGE.includes(role)) await assertSucceeds(call);
      else await assertFails(call); // colaborador/advisor no ven semillas ajenas
    }
  });
});

describe('suggestions (agente)', () => {
  it('triage lee y decide; advisor no; nadie crea desde el cliente', async () => {
    await assertSucceeds(getDoc(doc(as('u_pm', 'pm'), 'suggestions/g1')));
    await assertFails(getDoc(doc(as('u_adv', 'advisor'), 'suggestions/g1')));
    await assertSucceeds(
      updateDoc(doc(as('u_pm', 'pm'), 'suggestions/g1'), { status: 'aceptada' }),
    );
    await assertFails(
      setDoc(doc(as('u_ceo', 'ceo'), 'suggestions/g2'), { status: 'nueva', text: 'x' }),
    );
  });
});

describe('config', () => {
  it('interno lee; visitante no; solo admins escriben', async () => {
    await assertSucceeds(getDoc(doc(as('u_pm', 'pm'), 'config/taxonomy')));
    await assertFails(getDoc(doc(as('u_v', 'visitante'), 'config/taxonomy')));
    await assertSucceeds(setDoc(doc(as('u_ceo', 'ceo'), 'config/agent'), { level: 1 }));
    await assertFails(setDoc(doc(as('u_pm', 'pm'), 'config/agent'), { level: 1 }));
  });
});

describe('public/summary (visitante)', () => {
  it('visitante lee el resumen; pendiente y anónimo no; nadie lo escribe', async () => {
    await assertSucceeds(getDoc(doc(as('u_v', 'visitante'), 'public/summary')));
    await assertFails(getDoc(doc(as('u_p', 'pendiente'), 'public/summary')));
    await assertFails(getDoc(doc(anon(), 'public/summary')));
    await assertFails(setDoc(doc(as('u_ceo', 'ceo'), 'public/summary'), { totals: { hack: 1 } }));
  });
});

describe('users y roles', () => {
  it('lectura: propio sí; ajeno solo admins', async () => {
    await assertSucceeds(getDoc(doc(as('u_vendedor', 'vendedor'), 'users/u_vendedor')));
    await assertFails(getDoc(doc(as('u_vendedor', 'vendedor'), 'users/u_other')));
    await assertSucceeds(getDoc(doc(as('u_ceo', 'ceo'), 'users/u_other')));
  });
  it('autoedición limitada a campos seguros; el rol solo lo cambia un admin', async () => {
    await assertSucceeds(
      updateDoc(doc(as('u_vendedor', 'vendedor'), 'users/u_vendedor'), { displayName: 'Nueva' }),
    );
    await assertFails(
      updateDoc(doc(as('u_vendedor', 'vendedor'), 'users/u_vendedor'), { role: 'ceo' }),
    );
    await assertSucceeds(updateDoc(doc(as('u_ceo', 'ceo'), 'users/u_other'), { role: 'chief' }));
  });
});

describe('red de contactos (privacidad)', () => {
  it('cada quien lee/escribe su red; nadie más, ni el CEO', async () => {
    await assertSucceeds(getDoc(doc(as('u_ceo', 'ceo'), 'users/u_ceo/contacts/k1')));
    await assertSucceeds(
      setDoc(doc(as('u_ceo', 'ceo'), 'users/u_ceo/contacts/k2'), { name: 'Nuevo' }),
    );
    // Otro admin no puede leer la red ajena.
    await assertFails(getDoc(doc(as('u_cofounder', 'cofounder'), 'users/u_ceo/contacts/k1')));
  });
});

describe('invites (admin de usuarios)', () => {
  it('solo admins leen y crean invitaciones', async () => {
    await assertSucceeds(getDoc(doc(as('u_ceo', 'ceo'), 'invites/inv@ext.com')));
    await assertSucceeds(
      setDoc(doc(as('u_ceo', 'ceo'), 'invites/nuevo@ext.com'), {
        email: 'nuevo@ext.com',
        role: 'advisor',
      }),
    );
    await assertFails(getDoc(doc(as('u_pm', 'pm'), 'invites/inv@ext.com')));
    await assertFails(
      setDoc(doc(as('u_pm', 'pm'), 'invites/x@ext.com'), { email: 'x@ext.com', role: 'advisor' }),
    );
  });
});
