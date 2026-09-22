import { describe, it, expect } from 'vitest';
import {
  findDuplicates,
  norm,
  normPhone,
  parseMecard,
  parseQr,
  parseVCard,
  seedToItem,
} from './seeds.js';

describe('normalización', () => {
  it('norm quita acentos, espacios y mayúsculas', () => {
    expect(norm('  YPF  Luz ')).toBe('ypf luz');
    expect(norm('Petróleo')).toBe('petroleo');
  });
  it('normPhone deja solo dígitos y el +', () => {
    expect(normPhone('+54 (11) 5555-1234')).toBe('+541155551234');
    expect(normPhone('11 5555 1234')).toBe('1155551234');
  });
});

describe('parseVCard', () => {
  it('extrae nombre, org, cargo, email, tel y linkedin', () => {
    const v = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'FN:Ana Pérez',
      'ORG:YPF S.A.;Gerencia',
      'TITLE:HSE Manager',
      'EMAIL;TYPE=WORK:ana@ypf.com',
      'TEL;TYPE=CELL:+541155551234',
      'URL:https://www.linkedin.com/in/anaperez',
      'END:VCARD',
    ].join('\n');
    const e = parseVCard(v);
    expect(e.name).toBe('Ana Pérez');
    expect(e.org).toBe('YPF S.A.');
    expect(e.role).toBe('HSE Manager');
    expect(e.email).toBe('ana@ypf.com');
    expect(e.phone).toBe('+541155551234');
    expect(e.linkedin).toContain('linkedin.com');
  });
});

describe('parseMecard', () => {
  it('extrae los campos básicos', () => {
    const e = parseMecard('MECARD:N:Pérez,Ana;ORG:YPF;TEL:+5411;EMAIL:ana@ypf.com;;');
    expect(e.name).toBe('Ana Pérez');
    expect(e.org).toBe('YPF');
    expect(e.email).toBe('ana@ypf.com');
  });
});

describe('parseQr', () => {
  it('clasifica vcard, mecard, url y texto', () => {
    expect(parseQr('BEGIN:VCARD\nFN:X\nEND:VCARD').kind).toBe('vcard');
    expect(parseQr('MECARD:N:X;;').kind).toBe('mecard');
    const url = parseQr('https://www.linkedin.com/in/x');
    expect(url.kind).toBe('url');
    if (url.kind === 'url') expect(url.extracted.linkedin).toContain('linkedin');
    expect(parseQr('solo un texto').kind).toBe('text');
  });
});

describe('findDuplicates', () => {
  const existing = [
    { id: 'a', email: 'ana@ypf.com', name: 'Ana', org: 'YPF' },
    { id: 'b', phone: '+541155551234', name: 'Beto', org: 'CNH' },
    { id: 'c', name: 'Ana', org: 'YPF S.A.' },
  ];
  it('coincide por email', () => {
    expect(findDuplicates({ id: 'x', email: 'ANA@ypf.com' }, existing)).toEqual(['a']);
  });
  it('coincide por teléfono normalizado', () => {
    expect(findDuplicates({ id: 'x', phone: '+54 11 5555 1234' }, existing)).toEqual(['b']);
  });
  it('coincide por org + nombre', () => {
    expect(findDuplicates({ id: 'x', name: 'ana', org: 'ypf s.a.' }, existing)).toContain('c');
  });
  it('no se compara consigo misma', () => {
    expect(findDuplicates({ id: 'a', email: 'ana@ypf.com' }, existing)).not.toContain('a');
  });
});

describe('seedToItem', () => {
  it('mapea la semilla a los campos de una hoja con source semilla', () => {
    const item = seedToItem(
      {
        capturedBy: 'u1',
        eventId: 'ev1',
        extracted: { name: 'Ana', org: 'YPF', interest: 'app de seguridad', confidence: 0.9 },
      },
      'seed1',
      'Wizor Safety en empresas',
    );
    expect(item.title).toBe('YPF');
    expect(item.contact).toBe('Ana');
    expect(item.description).toBe('app de seguridad');
    expect(item.stage).toBe('exploracion');
    expect(item.source).toEqual({
      kind: 'semilla',
      seedId: 'seed1',
      eventId: 'ev1',
      capturedBy: 'u1',
    });
  });
});
