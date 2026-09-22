/**
 * Sincroniza el rol del documento `users/{uid}` con el custom claim `role`,
 * para que las reglas de seguridad lo lean sin costo de lectura.
 * Ver docs/02-arquitectura.md.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { getAuth } from 'firebase-admin/auth';
import { isRole } from '@pando/shared';
import { REGION } from './config.js';

export const setRoleClaim = onDocumentWritten(
  { document: 'users/{uid}', region: REGION },
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    const role = after?.exists ? (after.data()?.role as unknown) : undefined;

    try {
      if (!isRole(role)) {
        // Documento borrado o sin rol válido: se limpia el claim.
        await getAuth().setCustomUserClaims(uid, null);
        logger.info('Claim de rol limpiado', { uid });
        return;
      }
      await getAuth().setCustomUserClaims(uid, { role });
      logger.info('Claim de rol asignado', { uid, role });
    } catch (err) {
      // El usuario de Auth puede no existir todavía (doc creado por invitación
      // antes del primer login). No es un error fatal: el claim se aplicará
      // cuando el doc se reescriba tras el alta en Auth.
      logger.warn('No se pudo asignar el claim de rol (¿usuario de Auth aún no existe?)', {
        uid,
        error: (err as Error).message,
      });
    }
  },
);
