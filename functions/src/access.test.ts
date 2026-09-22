import { describe, it, expect } from 'vitest';
import { accessStatus, decideAccess, emailDomain, emailKey } from './access.js';

describe('helpers de email', () => {
  it('extrae el dominio y normaliza la clave', () => {
    expect(emailDomain('Ana@Wizor.io')).toBe('wizor.io');
    expect(emailKey('  Ana@Wizor.io ')).toBe('ana@wizor.io');
  });
});

describe('decideAccess', () => {
  const WD = 'wizor.io';

  it('usuario existente → existing con su rol', () => {
    const d = decideAccess({ email: 'a@wizor.io', workspaceDomain: WD, existingRole: 'pm' });
    expect(d).toEqual({ kind: 'existing', role: 'pm' });
  });

  it('con invitación válida → from-invite', () => {
    const d = decideAccess({
      email: 'ext@gmail.com',
      workspaceDomain: WD,
      invite: { role: 'advisor', alias: ['Ext'], invitedBy: 'u_ceo' },
    });
    expect(d).toEqual({ kind: 'from-invite', role: 'advisor', alias: ['Ext'], invitedBy: 'u_ceo' });
  });

  it('una invitación con rol pendiente no habilita acceso por invitación', () => {
    const d = decideAccess({
      email: 'ext@gmail.com',
      workspaceDomain: WD,
      invite: { role: 'pendiente' },
    });
    expect(d.kind).toBe('no-access');
  });

  it('email del dominio sin invitación → new-pending', () => {
    const d = decideAccess({ email: 'nuevo@wizor.io', workspaceDomain: WD });
    expect(d.kind).toBe('new-pending');
  });

  it('email externo sin invitación → no-access', () => {
    const d = decideAccess({ email: 'ajeno@gmail.com', workspaceDomain: WD });
    expect(d.kind).toBe('no-access');
  });
});

describe('accessStatus', () => {
  it('mapea cada decisión al estado de UI', () => {
    expect(accessStatus({ kind: 'existing', role: 'ceo' })).toBe('ready');
    expect(accessStatus({ kind: 'existing', role: 'pendiente' })).toBe('pending');
    expect(accessStatus({ kind: 'from-invite', role: 'advisor', alias: [] })).toBe('ready');
    expect(accessStatus({ kind: 'new-pending' })).toBe('pending');
    expect(accessStatus({ kind: 'no-access' })).toBe('no-access');
  });
});
