/**
 * Estado de autenticación y acceso. Combina el usuario de Firebase Auth con su
 * documento `users/{uid}` para resolver el rol y la pantalla que corresponde.
 *
 * Reglas de acceso (Sprint 0, ver docs/03-roadmap.md):
 * - Sin sesión → pantalla de login.
 * - Con sesión pero sin documento en `users`:
 *   - email del dominio de Workspace → 'pending' (queda a la espera de rol).
 *   - otro dominio → 'no-access' (necesita invitación explícita).
 * - Con documento y rol 'pendiente' → 'pending'.
 * - Con documento y rol válido → 'ready'.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut as fbSignOut, type User as FbUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from '@pando/shared';
import { isRole } from '@pando/shared';
import { auth, db } from '../firebase';
import { ensureAccess } from '../api/users';
import { AuthContext, type AuthState, type AuthStatus } from './AuthContext';

const WORKSPACE_DOMAIN = 'wizor.io';

function emailDomain(email: string | null): string {
  return email?.split('@')[1]?.toLowerCase() ?? '';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FbUser | null>(null);
  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    return onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUserDoc(null);
        setStatus('signed-out');
      } else {
        setStatus('loading');
      }
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    // Crea o reclama el documento del usuario en el servidor (persiste a los
    // pendientes para que un admin pueda asignarles rol). Idempotente; si las
    // functions no están disponibles, se cae al chequeo por dominio de abajo.
    void ensureAccess().catch(() => {
      /* sin functions (p.ej. dev sin emulador): se resuelve por el snapshot */
    });
    const ref = doc(db, 'users', firebaseUser.uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setUserDoc(null);
          setStatus(emailDomain(firebaseUser.email) === WORKSPACE_DOMAIN ? 'pending' : 'no-access');
          return;
        }
        const data = snap.data() as User;
        setUserDoc(data);
        setStatus(isRole(data.role) && data.role !== 'pendiente' ? 'ready' : 'pending');
      },
      () => {
        // Las reglas pueden negar la lectura a quien no tiene rol; se trata
        // como acceso pendiente en vez de romper la app.
        setUserDoc(null);
        setStatus(emailDomain(firebaseUser.email) === WORKSPACE_DOMAIN ? 'pending' : 'no-access');
      },
    );
  }, [firebaseUser]);

  const value: AuthState = {
    status,
    firebaseUser,
    role: userDoc && isRole(userDoc.role) ? userDoc.role : null,
    userDoc,
    signOut: () => fbSignOut(auth),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
