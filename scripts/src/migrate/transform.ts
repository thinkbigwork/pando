/**
 * Transformaciones puras de la migración inicial (seed/items.json → Firestore).
 * Sin efectos: se pueden testear y correr en `--dry-run` sin base de datos.
 * Ver docs/02-arquitectura.md ("Migración inicial").
 */

import type { Item, Taxonomy } from '@pando/shared';

/** Forma laxa de cada entrada de seed/items.json (incluye arrays embebidos que
 * la arquitectura mueve a subcolecciones: `comments` y `meetings`). */
export interface RawSeedItem {
  title: string;
  type: string;
  trunk: string;
  branch: string;
  sector: string;
  country: string;
  org: string;
  description: string;
  stage: string;
  stageDetail: string;
  probability: number;
  priority: string;
  amount1: number | null;
  duration1: number | null;
  amount2: number | null;
  duration2: number | null;
  currency?: string;
  funding?: string;
  forecast?: string;
  contact?: string;
  decisionMaker?: string;
  intermediary?: string;
  support?: string[];
  owners?: string[];
  nextStep?: string;
  deadline?: string;
  kpis?: string;
  notes?: string;
  steps?: Item['steps'];
  docs?: Item['docs'];
  deps?: string[];
  links?: Partial<Item['links']>;
  visibleToVisitors?: boolean;
  archived?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
  // Se separan a subcolecciones:
  comments?: Record<string, unknown>[];
  meetings?: Record<string, unknown>[];
}

/** Índice de usuario para mapear owners: alias y nombre visible normalizados → uid. */
export interface UserForIndex {
  uid: string;
  displayName?: string;
  alias?: string[];
}

export function normalizeName(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); // sin acentos
}

/** Construye el índice nombre/alias normalizado → uid. */
export function buildAliasIndex(users: UserForIndex[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const u of users) {
    const names = [u.displayName, ...(u.alias ?? [])].filter((n): n is string => !!n);
    for (const n of names) {
      const key = normalizeName(n);
      if (key && !index.has(key)) index.set(key, u.uid);
    }
  }
  return index;
}

export interface OwnerMapResult {
  ownerUids: string[];
  unmatched: string[];
}

/** Mapea nombres de owners a uids. Los nombres sin match se listan para el reporte. */
export function mapOwners(owners: string[] = [], aliasIndex: Map<string, string>): OwnerMapResult {
  const ownerUids: string[] = [];
  const unmatched: string[] = [];
  for (const name of owners) {
    const uid = aliasIndex.get(normalizeName(name));
    if (uid) {
      if (!ownerUids.includes(uid)) ownerUids.push(uid);
    } else if (name.trim() && !unmatched.includes(name)) {
      unmatched.push(name);
    }
  }
  return { ownerUids, unmatched };
}

/** Extrae los arrays embebidos que van a subcolecciones, con id estable. */
export interface Subcollections {
  comments: { id: string; data: Record<string, unknown> }[];
  meetings: { id: string; data: Record<string, unknown> }[];
}

export function extractSubcollections(raw: RawSeedItem): Subcollections {
  const withIds = (arr: Record<string, unknown>[] | undefined, prefix: string) =>
    (arr ?? []).map((data, i) => ({
      id: typeof data.id === 'string' && data.id ? data.id : `${prefix}${i + 1}`,
      data,
    }));
  return {
    comments: withIds(raw.comments, 'c'),
    meetings: withIds(raw.meetings, 'm'),
  };
}

const ACTOR = 'system:migration';

/** Convierte una entrada del seed en el documento `items/{id}` (sin subcolecciones). */
export function toItemDoc(raw: RawSeedItem, ownerUids: string[], nowIso: string): Item {
  return {
    title: raw.title,
    type: raw.type,
    trunk: raw.trunk,
    branch: raw.branch,
    sector: raw.sector,
    country: raw.country,
    org: raw.org,
    description: raw.description,
    stage: raw.stage as Item['stage'],
    stageDetail: raw.stageDetail ?? '',
    probability: raw.probability,
    priority: (raw.priority as Item['priority']) ?? 'media',
    amount1: raw.amount1 ?? null,
    duration1: raw.duration1 ?? null,
    amount2: raw.amount2 ?? null,
    duration2: raw.duration2 ?? null,
    currency: 'USD',
    funding: raw.funding ?? '',
    forecast: raw.forecast ?? '',
    contact: raw.contact ?? '',
    decisionMaker: raw.decisionMaker ?? '',
    intermediary: raw.intermediary ?? '',
    support: raw.support ?? [],
    owners: raw.owners ?? [],
    ownerUids,
    nextStep: raw.nextStep ?? '',
    deadline: raw.deadline ?? '',
    kpis: raw.kpis ?? '',
    notes: raw.notes ?? '',
    steps: raw.steps ?? [],
    docs: raw.docs ?? [],
    deps: raw.deps ?? [],
    links: {
      drive: raw.links?.drive ?? '',
      slack: raw.links?.slack ?? '',
      jira: raw.links?.jira ?? '',
    },
    source: { kind: 'planilla' },
    visibleToVisitors: raw.visibleToVisitors ?? false,
    archived: raw.archived ?? false,
    order: raw.order ?? 0,
    createdAt: raw.createdAt ?? nowIso,
    createdBy: ACTOR,
    updatedAt: raw.updatedAt ?? nowIso,
    updatedBy: ACTOR,
  };
}

/** Construye `config/taxonomy` a partir de los troncos y ramas presentes.
 * El orden respeta la primera aparición (estable e idempotente). */
export function buildTaxonomy(items: Record<string, RawSeedItem>): Taxonomy {
  const trunkOrder: string[] = [];
  const branchesByTrunk = new Map<string, string[]>();

  for (const id of Object.keys(items)) {
    const { trunk, branch } = items[id];
    if (trunk && !trunkOrder.includes(trunk)) {
      trunkOrder.push(trunk);
      branchesByTrunk.set(trunk, []);
    }
    if (trunk && branch) {
      const list = branchesByTrunk.get(trunk)!;
      if (!list.includes(branch)) list.push(branch);
    }
  }

  const trunks = trunkOrder.map((name, i) => ({ name, order: i + 1 }));
  const branches = trunkOrder.flatMap((trunk) =>
    (branchesByTrunk.get(trunk) ?? []).map((name, i) => ({ trunk, name, order: i + 1 })),
  );
  return { trunks, branches };
}
