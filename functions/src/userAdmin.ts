/**
 * Admin de usuarios: invitar por email, asignar rol y alias, y establecer el
 * acceso en el primer login. Toda validación se repite en el servidor.
 * Ver docs/03-roadmap.md (Sprint 1) y docs/01-producto.md (acceso por invitación).
 */

import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { ADMIN_ROLES, isRole, type Role } from '@pando/shared';
import { REGION, WORKSPACE_DOMAIN } from './config.js';
import { accessStatus, decideAccess, emailKey, type InviteData } from './access.js';

function requireAuth(req: CallableRequest): { uid: string; email: string; role?: string } {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Necesitás iniciar sesión.');
  const email = (req.auth.token.email as string | undefined)?.toLowerCase();
  if (!email) throw new HttpsError('failed-precondition', 'La cuenta no tiene email.');
  return { uid: req.auth.uid, email, role: req.auth.token.role as string | undefined };
}

function requireAdmin(req: CallableRequest): void {
  const role = req.auth?.token.role as string | undefined;
  if (!role || !ADMIN_ROLES.includes(role as Role)) {
    throw new HttpsError('permission-denied', 'Solo un CEO o cofounder puede hacer esto.');
  }
}

/** Registra la corrida en auditLog. */
async function audit(
  db: Firestore,
  actorUid: string,
  action: string,
  path: string,
  after: Record<string, unknown>,
): Promise<void> {
  await db.collection('auditLog').add({
    actor: { type: 'user', id: actorUid },
    action,
    path,
    after,
    at: FieldValue.serverTimestamp(),
  });
}

/**
 * Se invoca tras iniciar sesión. Crea o reclama el documento del usuario y
 * devuelve su estado de acceso. Idempotente.
 */
export const ensureAccess = onCall({ region: REGION }, async (req) => {
  const { uid, email } = requireAuth(req);
  const db = getFirestore();

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const existingRole = userSnap.exists ? (userSnap.data()?.role as Role | undefined) : undefined;

  let invite: InviteData | null = null;
  if (!existingRole) {
    const inviteSnap = await db.doc(`invites/${emailKey(email)}`).get();
    if (inviteSnap.exists) invite = inviteSnap.data() as InviteData;
  }

  const decision = decideAccess({
    email,
    workspaceDomain: WORKSPACE_DOMAIN,
    existingRole: existingRole ?? null,
    invite,
  });

  if (decision.kind === 'from-invite') {
    await userRef.set(
      {
        email,
        displayName: (req.auth?.token.name as string | undefined) ?? email,
        role: decision.role,
        alias: decision.alias,
        active: true,
        invitedBy: decision.invitedBy ?? null,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await db
      .doc(`invites/${emailKey(email)}`)
      .set({ claimed: true, claimedBy: uid }, { merge: true });
    logger.info('Acceso por invitación', { uid, role: decision.role });
  } else if (decision.kind === 'new-pending') {
    await userRef.set(
      {
        email,
        displayName: (req.auth?.token.name as string | undefined) ?? email,
        role: 'pendiente',
        alias: [],
        active: false,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    logger.info('Usuario pendiente creado', { uid });
  }

  const status = accessStatus(decision);
  const role =
    decision.kind === 'existing' || decision.kind === 'from-invite' ? decision.role : null;
  return { status, role };
});

/** Invita a alguien por email con un rol (admin). */
export const inviteUser = onCall({ region: REGION }, async (req) => {
  requireAdmin(req);
  const { uid } = requireAuth(req);
  const email = emailKey(String(req.data?.email ?? ''));
  const role = req.data?.role as string | undefined;
  const alias = Array.isArray(req.data?.alias) ? (req.data.alias as string[]) : [];

  if (!email || !email.includes('@')) {
    throw new HttpsError('invalid-argument', 'Email inválido.');
  }
  if (!isRole(role) || role === 'pendiente') {
    throw new HttpsError('invalid-argument', 'Rol inválido para una invitación.');
  }

  const db = getFirestore();
  await db.doc(`invites/${email}`).set(
    {
      email,
      role,
      alias,
      invitedBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      claimed: false,
    },
    { merge: true },
  );
  await audit(db, uid, 'user.invite', `invites/${email}`, { email, role });
  return { ok: true };
});

/** Asigna o cambia el rol y los alias de un usuario existente (admin). */
export const setUserRole = onCall({ region: REGION }, async (req) => {
  requireAdmin(req);
  const { uid } = requireAuth(req);
  const targetUid = String(req.data?.uid ?? '');
  const role = req.data?.role as string | undefined;
  const alias = Array.isArray(req.data?.alias) ? (req.data.alias as string[]) : undefined;

  if (!targetUid) throw new HttpsError('invalid-argument', 'Falta el uid.');
  if (!isRole(role)) throw new HttpsError('invalid-argument', 'Rol inválido.');

  const db = getFirestore();
  const ref = db.doc(`users/${targetUid}`);
  if (!(await ref.get()).exists) {
    throw new HttpsError('not-found', 'El usuario no existe.');
  }
  await ref.set(
    { role, active: role !== 'pendiente', ...(alias ? { alias } : {}) },
    { merge: true },
  );
  await audit(db, uid, 'user.setRole', `users/${targetUid}`, { role });
  // El custom claim lo sincroniza el trigger setRoleClaim.
  return { ok: true };
});
