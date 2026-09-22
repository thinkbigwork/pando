import { describe, it, expect } from 'vitest';
import {
  buildAliasIndex,
  buildTaxonomy,
  extractSubcollections,
  mapOwners,
  normalizeName,
  toItemDoc,
  type RawSeedItem,
} from './transform.js';

describe('normalizeName', () => {
  it('recorta, pasa a minúsculas y quita acentos', () => {
    expect(normalizeName('  Martín ')).toBe('martin');
    expect(normalizeName('Esteban')).toBe('esteban');
  });
});

describe('mapeo de owners', () => {
  const index = buildAliasIndex([
    { uid: 'u_martin', displayName: 'Martín Méndez', alias: ['Martin'] },
    { uid: 'u_esteban', displayName: 'Esteban', alias: [] },
  ]);

  it('mapea nombres/alias a uid y evita duplicados', () => {
    const r = mapOwners(['Esteban', 'Martin', 'Martin'], index);
    expect(r.ownerUids).toEqual(['u_esteban', 'u_martin']);
    expect(r.unmatched).toEqual([]);
  });

  it('lista los nombres sin match para el reporte', () => {
    const r = mapOwners(['Esteban', 'Fulano'], index);
    expect(r.ownerUids).toEqual(['u_esteban']);
    expect(r.unmatched).toEqual(['Fulano']);
  });

  it('sin usuarios, todos los owners quedan sin match', () => {
    const r = mapOwners(['Esteban', 'Martin'], new Map());
    expect(r.ownerUids).toEqual([]);
    expect(r.unmatched).toEqual(['Esteban', 'Martin']);
  });
});

describe('extracción de subcolecciones', () => {
  it('separa comments y meetings con id estable', () => {
    const raw = {
      comments: [{ id: 'c1', text: 'hola' }, { text: 'sin id' }],
      meetings: [{ title: 'kickoff' }],
    } as unknown as RawSeedItem;
    const sub = extractSubcollections(raw);
    expect(sub.comments.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(sub.meetings.map((m) => m.id)).toEqual(['m1']);
  });
});

describe('toItemDoc', () => {
  const raw: RawSeedItem = {
    title: 'Abbott',
    type: 'Cliente',
    trunk: 'Wizor Safety en empresas',
    branch: 'Industria y salud',
    sector: 'Empresa',
    country: 'Argentina',
    org: 'Abbott',
    description: 'Evaluacion',
    stage: 'propuesta',
    stageDetail: 'Presupuesto',
    probability: 35,
    priority: 'media',
    amount1: 180000,
    duration1: 12,
    amount2: null,
    duration2: null,
    owners: ['Esteban'],
    comments: [{ id: 'c1', text: 'x' }],
    meetings: [{ title: 'm' }],
  };

  it('arma el doc sin comments/meetings y con metadatos de migración', () => {
    const doc = toItemDoc(raw, ['u_esteban'], '2026-01-01T00:00:00Z');
    expect(doc).not.toHaveProperty('comments');
    expect(doc).not.toHaveProperty('meetings');
    expect(doc.ownerUids).toEqual(['u_esteban']);
    expect(doc.owners).toEqual(['Esteban']);
    expect(doc.currency).toBe('USD');
    expect(doc.source).toEqual({ kind: 'planilla' });
    expect(doc.createdBy).toBe('system:migration');
  });

  it('preserva null en montos (null ≠ 0)', () => {
    const doc = toItemDoc(raw, [], '2026-01-01T00:00:00Z');
    expect(doc.amount2).toBeNull();
    expect(doc.amount1).toBe(180000);
  });
});

describe('buildTaxonomy', () => {
  it('deriva troncos y ramas por primera aparición, sin duplicados', () => {
    const items: Record<string, RawSeedItem> = {
      a: { trunk: 'T1', branch: 'B1' } as RawSeedItem,
      b: { trunk: 'T1', branch: 'B2' } as RawSeedItem,
      c: { trunk: 'T2', branch: 'B1' } as RawSeedItem,
      d: { trunk: 'T1', branch: 'B1' } as RawSeedItem,
    };
    const tax = buildTaxonomy(items);
    expect(tax.trunks).toEqual([
      { name: 'T1', order: 1 },
      { name: 'T2', order: 2 },
    ]);
    expect(tax.branches).toEqual([
      { trunk: 'T1', name: 'B1', order: 1 },
      { trunk: 'T1', name: 'B2', order: 2 },
      { trunk: 'T2', name: 'B1', order: 1 },
    ]);
  });
});
