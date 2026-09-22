import { describe, it, expect } from 'vitest';
import {
  activeAmount,
  buildForest,
  isActive,
  isOpen,
  money,
  urgency,
  type ItemWithId,
} from './model';

function item(partial: Partial<ItemWithId>): ItemWithId {
  return {
    id: partial.id ?? 'x',
    title: partial.title ?? 'X',
    trunk: partial.trunk ?? 'T1',
    branch: partial.branch ?? 'B1',
    stage: partial.stage ?? 'propuesta',
    amount1: partial.amount1 ?? null,
    deadline: partial.deadline ?? '',
    archived: partial.archived ?? false,
    // resto de campos no relevantes para estos tests
  } as ItemWithId;
}

describe('estado de la hoja', () => {
  it('isActive excluye archivadas, perdidas y pausadas', () => {
    expect(isActive(item({ stage: 'propuesta' }))).toBe(true);
    expect(isActive(item({ stage: 'perdido' }))).toBe(false);
    expect(isActive(item({ archived: true }))).toBe(false);
  });
  it('isOpen excluye además cierre y despliegue', () => {
    expect(isOpen(item({ stage: 'poc' }))).toBe(true);
    expect(isOpen(item({ stage: 'despliegue' }))).toBe(false);
  });
});

describe('urgency', () => {
  const soon = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const past = new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10);
  const far = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
  it('clasifica por deadline', () => {
    expect(urgency(item({ deadline: past }))).toBe('late');
    expect(urgency(item({ deadline: soon }))).toBe('soon');
    expect(urgency(item({ deadline: far }))).toBe('far');
    expect(urgency(item({ deadline: '' }))).toBe('none');
  });
  it('una hoja cerrada nunca es urgente', () => {
    expect(urgency(item({ stage: 'cierre', deadline: past }))).toBe('none');
  });
});

describe('money', () => {
  it('formatea k y M, y sin monto', () => {
    expect(money(null)).toBe('sin monto');
    expect(money(180000)).toContain('k');
    expect(money(2500000)).toContain('M');
  });
});

describe('buildForest', () => {
  const items: ItemWithId[] = [
    item({ id: 'a', trunk: 'T1', branch: 'B1', amount1: 100 }),
    item({ id: 'b', trunk: 'T1', branch: 'B2', amount1: 200 }),
    item({ id: 'c', trunk: 'T2', branch: 'B1', amount1: 300 }),
  ];

  it('agrupa raíz → troncos → ramas → hojas', () => {
    const root = buildForest(items, new Set());
    expect(root.kind).toBe('root');
    expect(root.children?.map((t) => t.name)).toEqual(['T1', 'T2']);
    const t1 = root.children![0];
    expect(t1.children?.map((b) => b.name)).toEqual(['B1', 'B2']);
    expect(t1.leaves).toHaveLength(2);
  });

  it('un tronco plegado no expone ramas pero conserva sus hojas para el total', () => {
    const root = buildForest(items, new Set(['t:T1']));
    const t1 = root.children!.find((t) => t.name === 'T1')!;
    expect(t1.children).toBeUndefined();
    expect(t1.leaves).toHaveLength(2);
  });

  it('una rama plegada oculta las hojas', () => {
    const root = buildForest(items, new Set(['b:T1/B1']));
    const b1 = root.children![0].children!.find((b) => b.name === 'B1')!;
    expect(b1.children).toBeUndefined();
  });
});

describe('activeAmount', () => {
  it('suma amount1 de las hojas activas', () => {
    expect(
      activeAmount([
        item({ amount1: 100 }),
        item({ amount1: 50, stage: 'perdido' }),
        item({ amount1: 25 }),
      ]),
    ).toBe(125);
  });
});
