/**
 * Lógica pura de acceso (sin efectos), para poder testearla sin backend.
 * Decide qué hacer cuando alguien autenticado entra por primera vez.
 * Ver docs/03-roadmap.md (Sprint 1, admin de usuarios) y docs/01-producto.md.
 */

import type { Role } from '@pando/shared';
import { isRole } from '@pando/shared';

export interface InviteData {
  role: Role;
  alias?: string[];
  invitedBy?: string;
}

export type AccessDecision =
  | { kind: 'existing'; role: Role }
  | { kind: 'from-invite'; role: Role; alias: string[]; invitedBy?: string }
  | { kind: 'new-pending' }
  | { kind: 'no-access' };

export function emailDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() ?? '';
}

/** Normaliza un email para usarlo como id de documento en `invites`. */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Resuelve el acceso:
 * - ya tiene documento → 'existing'.
 * - hay invitación válida → 'from-invite' (crea el usuario con ese rol).
 * - email del dominio de Workspace → 'new-pending' (queda a la espera de rol).
 * - cualquier otro → 'no-access' (no se crea nada).
 */
export function decideAccess(params: {
  email: string;
  workspaceDomain: string;
  existingRole?: Role | null;
  invite?: InviteData | null;
}): AccessDecision {
  const { email, workspaceDomain, existingRole, invite } = params;

  if (existingRole && isRole(existingRole)) {
    return { kind: 'existing', role: existingRole };
  }
  if (invite && isRole(invite.role) && invite.role !== 'pendiente') {
    return {
      kind: 'from-invite',
      role: invite.role,
      alias: invite.alias ?? [],
      invitedBy: invite.invitedBy,
    };
  }
  if (emailDomain(email) === workspaceDomain.toLowerCase()) {
    return { kind: 'new-pending' };
  }
  return { kind: 'no-access' };
}

/** Traduce la decisión al estado que consume la UI. */
export function accessStatus(decision: AccessDecision): 'ready' | 'pending' | 'no-access' {
  switch (decision.kind) {
    case 'existing':
      return decision.role === 'pendiente' ? 'pending' : 'ready';
    case 'from-invite':
      return 'ready';
    case 'new-pending':
      return 'pending';
    case 'no-access':
      return 'no-access';
  }
}
