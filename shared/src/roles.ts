/**
 * Roles de Pando. Definidos una sola vez. Ver docs/01-producto.md.
 * `pendiente` es el estado de quien entró con un email del dominio pero
 * todavía no tiene rol asignado por un CEO o cofounder.
 */

export const ROLE_KEYS = [
  'ceo',
  'cofounder',
  'chief',
  'pm',
  'vendedor',
  'colaborador',
  'advisor',
  'visitante',
  'pendiente',
] as const;

export type Role = (typeof ROLE_KEYS)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLE_KEYS as readonly string[]).includes(value);
}

/** Roles que pueden hacer triage del semillero y crear hojas. */
export const TRIAGE_ROLES: Role[] = ['ceo', 'cofounder', 'chief', 'pm', 'vendedor'];

/** Roles con capacidad de administración (usuarios, roles, integraciones). */
export const ADMIN_ROLES: Role[] = ['ceo', 'cofounder'];
