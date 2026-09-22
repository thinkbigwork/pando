/**
 * Lógica pura del resumen público (vista de visitantes). Sin efectos, testeable.
 * El visitante solo lee `public/summary`; nunca `items`. Ver docs/01-producto.md.
 */

import type { StageKey } from '@pando/shared';

export interface SummaryInputItem {
  id: string;
  title: string;
  description?: string;
  trunk: string;
  stage: StageKey;
  amount1?: number | null;
  archived?: boolean;
  visibleToVisitors?: boolean;
  order?: number;
}

export interface Bucket {
  count: number;
  amount: number;
}

export interface PublicSummary {
  generatedAt: string;
  total: Bucket;
  byTrunk: Record<string, Bucket>;
  byStage: Partial<Record<StageKey, Bucket>>;
  /** Oportunidades marcadas visibles para visitantes (sin montos individuales). */
  visible: { id: string; title: string; trunk: string; stage: StageKey; description: string }[];
}

const TERMINAL: StageKey[] = ['perdido', 'pausado'];

function add(bucket: Bucket | undefined, amount: number): Bucket {
  return { count: (bucket?.count ?? 0) + 1, amount: (bucket?.amount ?? 0) + amount };
}

function shortDesc(s: string | undefined): string {
  const text = (s ?? '').trim();
  return text.length > 140 ? text.slice(0, 137) + '…' : text;
}

/**
 * Construye el resumen: totales por tronco y etapa (agregados, sin exponer el
 * monto de cada hoja) y la lista de oportunidades visibles con etapa y
 * descripción corta. Se ignoran las archivadas y las terminales en los totales.
 */
export function buildSummary(items: SummaryInputItem[], now: string): PublicSummary {
  const byTrunk: Record<string, Bucket> = {};
  const byStage: Partial<Record<StageKey, Bucket>> = {};
  let total: Bucket = { count: 0, amount: 0 };

  for (const it of items) {
    if (it.archived || TERMINAL.includes(it.stage)) continue;
    const amount = it.amount1 || 0;
    total = add(total, amount);
    byTrunk[it.trunk] = add(byTrunk[it.trunk], amount);
    byStage[it.stage] = add(byStage[it.stage], amount);
  }

  const visible = items
    .filter((it) => it.visibleToVisitors && !it.archived)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((it) => ({
      id: it.id,
      title: it.title,
      trunk: it.trunk,
      stage: it.stage,
      description: shortDesc(it.description),
    }));

  return { generatedAt: now, total, byTrunk, byStage, visible };
}
