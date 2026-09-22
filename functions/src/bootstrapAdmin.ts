/**
 * Primer arranque: asigna el rol `ceo` al email indicado por variable de
 * entorno, una sola vez. Ver docs/03-roadmap.md (Sprint 0).
 *
 * Flujo: el admin inicia sesión con Google una vez (para que exista su usuario
 * en Auth); luego se invoca esta función (una sola vez). Busca el usuario por
 * email, le pone el custom claim `role: 'ceo'`, crea su documento en `users` y
 * marca el bootstrap como hecho en `config/_bootstrap` para que no se repita.
 *
 * El email se pasa por la variable de entorno BOOTSTRAP_ADMIN_EMAIL
 * (no se hardcodea ninguna identidad en el código).
 */

import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { REGION } from './config.js';

const bootstrapAdminEmail = defineString('BOOTSTRAP_ADMIN_EMAIL');

export const bootstrapAdmin = onRequest({ region: REGION }, async (_req, res) => {
  const email = bootstrapAdminEmail.value().trim().toLowerCase();
  if (!email) {
    res.status(500).send('BOOTSTRAP_ADMIN_EMAIL no está configurado.');
    return;
  }

  const db = getFirestore();
  const bootstrapRef = db.doc('config/_bootstrap');

  const already = await bootstrapRef.get();
  if (already.exists && already.data()?.done === true) {
    res.status(409).send('El bootstrap ya se ejecutó. No se repite.');
    return;
  }

  let user;
  try {
    user = await getAuth().getUserByEmail(email);
  } catch {
    res
      .status(404)
      .send(
        `No existe un usuario de Auth con el email ${email}. ` +
          'Iniciá sesión con Google una vez y volvé a invocar esta función.',
      );
    return;
  }

  await getAuth().setCustomUserClaims(user.uid, { role: 'ceo' });

  await db.doc(`users/${user.uid}`).set(
    {
      email,
      displayName: user.displayName ?? email,
      role: 'ceo',
      alias: [],
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await bootstrapRef.set({ done: true, email, uid: user.uid, at: FieldValue.serverTimestamp() });

  logger.info('Bootstrap de CEO completado', { uid: user.uid, email });
  res
    .status(200)
    .send(`Listo: ${email} es CEO. Cerrá sesión y volvé a entrar para refrescar el token.`);
});
