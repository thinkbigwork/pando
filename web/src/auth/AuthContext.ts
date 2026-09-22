/** Contexto de autenticación y hook `useAuth`. Separado del provider para que
 * el archivo del provider exporte solo componentes (Fast Refresh). */

import { createContext, useContext } from 'react';
import type { User as FbUser } from 'firebase/auth';
import type { Role, User } from '@pando/shared';

export type AuthStatus = 'loading' | 'signed-out' | 'pending' | 'no-access' | 'ready';

export interface AuthState {
  status: AuthStatus;
  firebaseUser: FbUser | null;
  role: Role | null;
  userDoc: User | null;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
