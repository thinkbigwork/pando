import { describe, it, expect } from 'vitest';
import { buildSummary, type SummaryInputItem } from './summaryModel.js';

const base: SummaryInputItem = {
  id: 'a',
  title: 'A',
  trunk: 'T1',
  stage: 'propuesta',
  amount1: 100,
  visibleToVisitors: true,
};

describe('buildSummary', () => {
  it('agrega totales por tronco y etapa, ignorando archivadas y terminales', () => {
    const items: SummaryInputItem[] = [
      { ...base, id: 'a', trunk: 'T1', stage: 'propuesta', amount1: 100 },
      { ...base, id: 'b', trunk: 'T1', stage: 'poc', amount1: 200 },
      { ...base, id: 'c', trunk: 'T2', stage: 'propuesta', amount1: 300 },
      { ...base, id: 'd', trunk: 'T1', stage: 'perdido', amount1: 999 },
      { ...base, id: 'e', trunk: 'T1', stage: 'propuesta', amount1: 50, archived: true },
    ];
    const s = buildSummary(items, '2026-01-01T00:00:00Z');
    expect(s.total).toEqual({ count: 3, amount: 600 });
    expect(s.byTrunk['T1']).toEqual({ count: 2, amount: 300 });
    expect(s.byTrunk['T2']).toEqual({ count: 1, amount: 300 });
    expect(s.byStage['propuesta']).toEqual({ count: 2, amount: 400 });
    expect(s.byStage['perdido']).toBeUndefined();
  });

  it('la lista visible respeta visibleToVisitors y excluye archivadas', () => {
    const items: SummaryInputItem[] = [
      { ...base, id: 'a', visibleToVisitors: true, order: 2 },
      { ...base, id: 'b', visibleToVisitors: false },
      { ...base, id: 'c', visibleToVisitors: true, order: 1 },
      { ...base, id: 'd', visibleToVisitors: true, archived: true },
    ];
    const s = buildSummary(items, 'now');
    expect(s.visible.map((v) => v.id)).toEqual(['c', 'a']); // ordenadas por `order`
  });

  it('acorta descripciones largas', () => {
    const long = 'x'.repeat(200);
    const s = buildSummary([{ ...base, description: long }], 'now');
    expect(s.visible[0].description.endsWith('…')).toBe(true);
    expect(s.visible[0].description.length).toBeLessThanOrEqual(140);
  });

  it('no expone montos individuales en la lista visible', () => {
    const s = buildSummary([{ ...base }], 'now');
    expect(s.visible[0]).not.toHaveProperty('amount1');
  });
});
