import { describe, it, expect } from 'vitest';
import { can, PERMISSIONS, PERMISSION_KEYS } from './permissions.js';
import { ROLE_KEYS } from './roles.js';

describe('matriz de permisos', () => {
  it('define todos los permisos para todos los roles', () => {
    for (const role of ROLE_KEYS) {
      for (const key of PERMISSION_KEYS) {
        expect(PERMISSIONS[role][key], `${role}.${key}`).toBeDefined();
      }
    }
  });

  it('el visitante no puede casi nada y nunca ve montos', () => {
    expect(can('visitante', 'viewAmounts')).toBe(false);
    expect(can('visitante', 'viewTree')).toBe(false); // 'summary' no es acceso completo
    expect(can('visitante', 'captureSeeds')).toBe(false);
  });

  it('solo CEO y cofounder pueden eliminar y gestionar usuarios', () => {
    for (const role of ROLE_KEYS) {
      const allowed = role === 'ceo' || role === 'cofounder';
      expect(can(role, 'delete')).toBe(allowed);
      expect(can(role, 'manageUsers')).toBe(allowed);
    }
  });

  it('el vendedor edita y archiva solo lo propio', () => {
    expect(can('vendedor', 'editOwnLeaf', { isOwner: true })).toBe(true);
    expect(can('vendedor', 'editOwnLeaf', { isOwner: false })).toBe(false);
    expect(can('vendedor', 'editAnyLeaf')).toBe(false);
    expect(can('vendedor', 'archive', { isOwner: true })).toBe(true);
    expect(can('vendedor', 'archive', { isOwner: false })).toBe(false);
  });

  it('el colaborador ve montos solo donde tiene un paso asignado', () => {
    expect(can('colaborador', 'viewAmounts', { hasAssignedStep: true })).toBe(true);
    expect(can('colaborador', 'viewAmounts', { hasAssignedStep: false })).toBe(false);
  });

  it('el rol pendiente no tiene ningún permiso', () => {
    for (const key of PERMISSION_KEYS) {
      expect(can('pendiente', key, { isOwner: true, hasAssignedStep: true })).toBe(false);
    }
  });
});
