/**
 * Matriz de permisos por rol. Fuente única de verdad: se usa en la UI
 * (mostrar/ocultar), en las Cloud Functions y en los tests de reglas.
 * Espejo exacto de la tabla de docs/01-producto.md.
 *
 * Los permisos siempre se re-validan en el servidor (reglas de Firestore o
 * functions); esta matriz nunca es la única defensa.
 */

import type { Role } from './roles.js';

export const PERMISSION_KEYS = [
  'viewTree', // Ver árbol y totales
  'viewAmounts', // Ver montos por hoja
  'viewContacts', // Ver contactos
  'captureSeeds', // Capturar semillas
  'triageSeeds', // Triage del semillero (plantar/descartar)
  'createLeaves', // Crear hojas
  'editAnyLeaf', // Editar cualquier hoja
  'editOwnLeaf', // Editar hojas propias
  'markAssignedSteps', // Marcar pasos asignados
  'comment', // Comentar
  'archive', // Archivar
  'delete', // Eliminar
  'manageUsers', // Gestionar usuarios y roles
  'configureAgent', // Configurar agente e integraciones
  'loadNetwork', // Cargar su red de contactos
  'viewTeamConnections', // Ver conexiones visibles del equipo y pedir presentaciones
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * Valor de un permiso:
 * - `true` / `false`: permitido / denegado sin condición.
 * - `'own'`: permitido solo sobre recursos propios (uid en `ownerUids`).
 * - `'assigned'`: permitido solo donde la persona tiene un paso asignado.
 * - `'summary'`: acceso limitado (visitante ve solo `public/summary`).
 */
export type PermissionValue = boolean | 'own' | 'assigned' | 'summary';

type Matrix = Record<Role, Record<PermissionKey, PermissionValue>>;

const F = false;
const T = true;

export const PERMISSIONS: Matrix = {
  ceo: {
    viewTree: T,
    viewAmounts: T,
    viewContacts: T,
    captureSeeds: T,
    triageSeeds: T,
    createLeaves: T,
    editAnyLeaf: T,
    editOwnLeaf: T,
    markAssignedSteps: T,
    comment: T,
    archive: T,
    delete: T,
    manageUsers: T,
    configureAgent: T,
    loadNetwork: T,
    viewTeamConnections: T,
  },
  cofounder: {
    viewTree: T,
    viewAmounts: T,
    viewContacts: T,
    captureSeeds: T,
    triageSeeds: T,
    createLeaves: T,
    editAnyLeaf: T,
    editOwnLeaf: T,
    markAssignedSteps: T,
    comment: T,
    archive: T,
    delete: T,
    manageUsers: T,
    configureAgent: T,
    loadNetwork: T,
    viewTeamConnections: T,
  },
  chief: {
    viewTree: T,
    viewAmounts: T,
    viewContacts: T,
    captureSeeds: T,
    triageSeeds: T,
    createLeaves: T,
    editAnyLeaf: T,
    editOwnLeaf: T,
    markAssignedSteps: T,
    comment: T,
    archive: T,
    delete: F,
    manageUsers: F,
    configureAgent: F,
    loadNetwork: T,
    viewTeamConnections: T,
  },
  pm: {
    viewTree: T,
    viewAmounts: T,
    viewContacts: T,
    captureSeeds: T,
    triageSeeds: T,
    createLeaves: T,
    editAnyLeaf: T,
    editOwnLeaf: T,
    markAssignedSteps: T,
    comment: T,
    archive: T,
    delete: F,
    manageUsers: F,
    configureAgent: F,
    loadNetwork: T,
    viewTeamConnections: T,
  },
  vendedor: {
    viewTree: T,
    viewAmounts: T,
    viewContacts: T,
    captureSeeds: T,
    triageSeeds: T,
    createLeaves: T,
    editAnyLeaf: F,
    editOwnLeaf: 'own',
    markAssignedSteps: T,
    comment: T,
    archive: 'own',
    delete: F,
    manageUsers: F,
    configureAgent: F,
    loadNetwork: T,
    viewTeamConnections: T,
  },
  colaborador: {
    viewTree: T,
    viewAmounts: 'assigned',
    viewContacts: T,
    captureSeeds: T,
    triageSeeds: F,
    createLeaves: F,
    editAnyLeaf: F,
    editOwnLeaf: F,
    markAssignedSteps: T,
    comment: T,
    archive: F,
    delete: F,
    manageUsers: F,
    configureAgent: F,
    loadNetwork: T,
    viewTeamConnections: T,
  },
  advisor: {
    viewTree: T,
    viewAmounts: T,
    viewContacts: F,
    captureSeeds: T,
    triageSeeds: F,
    createLeaves: F,
    editAnyLeaf: F,
    editOwnLeaf: F,
    markAssignedSteps: F,
    comment: T,
    archive: F,
    delete: F,
    manageUsers: F,
    configureAgent: F,
    loadNetwork: T,
    viewTeamConnections: T,
  },
  visitante: {
    viewTree: 'summary',
    viewAmounts: F,
    viewContacts: F,
    captureSeeds: F,
    triageSeeds: F,
    createLeaves: F,
    editAnyLeaf: F,
    editOwnLeaf: F,
    markAssignedSteps: F,
    comment: F,
    archive: F,
    delete: F,
    manageUsers: F,
    configureAgent: F,
    loadNetwork: F,
    viewTeamConnections: F,
  },
  pendiente: {
    viewTree: F,
    viewAmounts: F,
    viewContacts: F,
    captureSeeds: F,
    triageSeeds: F,
    createLeaves: F,
    editAnyLeaf: F,
    editOwnLeaf: F,
    markAssignedSteps: F,
    comment: F,
    archive: F,
    delete: F,
    manageUsers: F,
    configureAgent: F,
    loadNetwork: F,
    viewTeamConnections: F,
  },
};

export interface PermissionContext {
  /** El uid del usuario está en `ownerUids` del recurso. */
  isOwner?: boolean;
  /** El usuario tiene un paso asignado en el recurso. */
  hasAssignedStep?: boolean;
}

/**
 * Resuelve si un rol puede realizar una acción, considerando el contexto.
 * `'summary'` se considera acceso limitado, no un permiso completo: devuelve
 * `false` para `can()` (el visitante consume `public/summary`, no la acción).
 */
export function can(role: Role, key: PermissionKey, ctx: PermissionContext = {}): boolean {
  const value = PERMISSIONS[role][key];
  if (value === true) return true;
  if (value === false || value === 'summary') return false;
  if (value === 'own') return ctx.isOwner === true;
  if (value === 'assigned') return ctx.hasAssignedStep === true;
  return false;
}

/** Devuelve el valor crudo del permiso (útil para lógica de UI matizada). */
export function permissionValue(role: Role, key: PermissionKey): PermissionValue {
  return PERMISSIONS[role][key];
}
