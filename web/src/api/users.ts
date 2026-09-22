/** Wrappers tipados de las Cloud Functions callables de admin de usuarios. */

import { httpsCallable } from 'firebase/functions';
import type { Role } from '@pando/shared';
import { functions } from '../firebase';

export interface EnsureAccessResult {
  status: 'ready' | 'pending' | 'no-access';
  role: Role | null;
}

/** Crea o reclama el documento del usuario tras iniciar sesión. Idempotente. */
export async function ensureAccess(): Promise<EnsureAccessResult> {
  const res = await httpsCallable<undefined, EnsureAccessResult>(functions, 'ensureAccess')();
  return res.data;
}

/** Invita a alguien por email con un rol (solo admin). */
export async function inviteUser(email: string, role: Role, alias: string[] = []): Promise<void> {
  await httpsCallable(functions, 'inviteUser')({ email, role, alias });
}

/** Asigna o cambia el rol y alias de un usuario (solo admin). */
export async function setUserRole(uid: string, role: Role, alias?: string[]): Promise<void> {
  await httpsCallable(functions, 'setUserRole')({ uid, role, alias });
}
