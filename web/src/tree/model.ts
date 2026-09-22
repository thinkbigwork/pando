/**
 * Helpers puros del árbol de oportunidades. Reproducen la lógica del prototipo
 * (reference/prototipo-pando.html) para que la vista React sea fiel.
 */

import type { Item, StageKey } from '@pando/shared';

export type ItemWithId = Item & { id: string };

export type Urgency = 'late' | 'soon' | 'ok' | 'far' | 'none';

const DAY = 864e5;

function todayLocal(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parsea 'YYYY-MM-DD' a Date local (o null). */
export function parseDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Días hasta el deadline (negativo = vencido). null si no hay fecha. */
export function daysTo(s: string | undefined | null): number | null {
  const d = parseDate(s);
  return d ? Math.round((d.getTime() - todayLocal().getTime()) / DAY) : null;
}

const TERMINAL: StageKey[] = ['perdido', 'pausado'];
const CLOSED: StageKey[] = ['despliegue', 'cierre'];

/** Activa = no archivada y no perdida/pausada. */
export function isActive(it: Pick<Item, 'archived' | 'stage'>): boolean {
  return !it.archived && !TERMINAL.includes(it.stage);
}

/** Abierta = activa y todavía no cerrada/desplegada (para urgencia). */
export function isOpen(it: Pick<Item, 'archived' | 'stage'>): boolean {
  return isActive(it) && !CLOSED.includes(it.stage);
}

export function urgency(it: Pick<Item, 'archived' | 'stage' | 'deadline'>): Urgency {
  if (!isOpen(it)) return 'none';
  const d = daysTo(it.deadline);
  if (d == null) return 'none';
  if (d < 0) return 'late';
  if (d <= 7) return 'soon';
  if (d <= 30) return 'ok';
  return 'far';
}

/** Formatea un monto USD como en el prototipo (k / M). */
export function money(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return 'sin monto';
  const a = Math.abs(n);
  if (a >= 1e6)
    return 'US$ ' + (n / 1e6).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' M';
  if (a >= 1e3) return 'US$ ' + Math.round(n / 1e3).toLocaleString('es-AR') + ' k';
  return 'US$ ' + n.toLocaleString('es-AR');
}

// ---------------------------------------------------------------------------
// Construcción del bosque (raíz → troncos → ramas → hojas)
// ---------------------------------------------------------------------------

export type NodeKind = 'root' | 'trunk' | 'branch' | 'leaf';

export interface ForestNode {
  name: string;
  kind: NodeKind;
  key?: string;
  it?: ItemWithId;
  children?: ForestNode[];
  /** Hojas bajo el nodo (para totales), aunque esté plegado. */
  leaves: ItemWithId[];
}

/**
 * Agrupa por tronco y rama respetando el conjunto `collapsed` (claves
 * 't:<tronco>' y 'b:<tronco>/<rama>'). Devuelve el árbol de datos que consume
 * d3.hierarchy.
 */
export function buildForest(items: ItemWithId[], collapsed: ReadonlySet<string>): ForestNode {
  const byTrunk = new Map<string, Map<string, ItemWithId[]>>();
  for (const it of items) {
    const trunk = it.trunk || 'Sin línea';
    const branch = it.branch || 'General';
    if (!byTrunk.has(trunk)) byTrunk.set(trunk, new Map());
    const branches = byTrunk.get(trunk)!;
    if (!branches.has(branch)) branches.set(branch, []);
    branches.get(branch)!.push(it);
  }

  const trunks: ForestNode[] = [];
  for (const [trunk, branches] of byTrunk) {
    const tKey = 't:' + trunk;
    const trunkLeaves = [...branches.values()].flat();
    const trunkCollapsed = collapsed.has(tKey);
    const branchNodes: ForestNode[] = [];
    if (!trunkCollapsed) {
      for (const [branch, leaves] of branches) {
        const bKey = 'b:' + trunk + '/' + branch;
        const branchCollapsed = collapsed.has(bKey);
        branchNodes.push({
          name: branch,
          kind: 'branch',
          key: bKey,
          leaves,
          children: branchCollapsed
            ? undefined
            : leaves.map((it) => ({ name: it.title, kind: 'leaf', it, leaves: [it] })),
        });
      }
    }
    trunks.push({
      name: trunk,
      kind: 'trunk',
      key: tKey,
      leaves: trunkLeaves,
      children: trunkCollapsed ? undefined : branchNodes,
    });
  }

  return { name: 'Wizor', kind: 'root', leaves: items, children: trunks };
}

/** Suma de amount1 de las hojas activas (para los subtotales de nodos). */
export function activeAmount(leaves: ItemWithId[]): number {
  return leaves.filter(isActive).reduce((a, i) => a + (i.amount1 || 0), 0);
}
