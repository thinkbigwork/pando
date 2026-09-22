/**
 * Helpers de semillas (contactos nuevos): parseo local de vCard/MECARD/QR,
 * detección de duplicados y mapeo de semilla a hoja. Puros y testeables; se
 * usan en web (captura por QR) y en functions (WhatsApp, processSeed).
 * Ver docs/04-integraciones.md.
 */

import type { Item, Seed, SeedExtracted } from './types.js';

/** Normaliza un texto para comparar (minúsculas, sin acentos ni espacios extra). */
export function norm(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
}

/** Normaliza un teléfono a solo dígitos (con prefijo + si estaba). */
export function normPhone(s: string | undefined | null): string {
  if (!s) return '';
  const plus = s.trim().startsWith('+');
  const digits = s.replace(/[^\d]/g, '');
  return (plus ? '+' : '') + digits;
}

// ---------------------------------------------------------------------------
// Parseo
// ---------------------------------------------------------------------------

/** Parsea una vCard (BEGIN:VCARD … END:VCARD) a campos de la semilla. */
export function parseVCard(text: string): Partial<SeedExtracted> {
  const out: Partial<SeedExtracted> = {};
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const idx = raw.indexOf(':');
    if (idx < 0) continue;
    const key = raw.slice(0, idx).toUpperCase();
    const value = raw.slice(idx + 1).trim();
    if (!value) continue;
    const base = key.split(';')[0];
    switch (base) {
      case 'FN':
        out.name = value;
        break;
      case 'N':
        if (!out.name) out.name = value.split(';').filter(Boolean).reverse().join(' ').trim();
        break;
      case 'ORG':
        out.org = value.split(';')[0];
        break;
      case 'TITLE':
        out.role = value;
        break;
      case 'EMAIL':
        if (!out.email) out.email = value;
        break;
      case 'TEL':
        if (!out.phone) out.phone = value;
        break;
      case 'URL':
        if (/linkedin\.com/i.test(value)) out.linkedin = value;
        break;
    }
  }
  return out;
}

/** Parsea un MECARD (MECARD:N:…;ORG:…;TEL:…;EMAIL:…;URL:…;;). */
export function parseMecard(text: string): Partial<SeedExtracted> {
  const out: Partial<SeedExtracted> = {};
  const body = text.replace(/^MECARD:/i, '');
  for (const field of body.split(';')) {
    const idx = field.indexOf(':');
    if (idx < 0) continue;
    const key = field.slice(0, idx).toUpperCase();
    const value = field.slice(idx + 1).trim();
    if (!value) continue;
    if (key === 'N') out.name = value.split(',').reverse().join(' ').trim();
    else if (key === 'ORG') out.org = value;
    else if (key === 'TEL') out.phone = value;
    else if (key === 'EMAIL') out.email = value;
    else if (key === 'URL' && /linkedin\.com/i.test(value)) out.linkedin = value;
  }
  return out;
}

export type QrParse =
  | { kind: 'vcard'; extracted: Partial<SeedExtracted> }
  | { kind: 'mecard'; extracted: Partial<SeedExtracted> }
  | { kind: 'url'; url: string; extracted: Partial<SeedExtracted> }
  | { kind: 'text'; text: string };

/** Clasifica el contenido de un QR y extrae lo que puede localmente. */
export function parseQr(text: string): QrParse {
  const t = text.trim();
  if (/^BEGIN:VCARD/i.test(t)) return { kind: 'vcard', extracted: parseVCard(t) };
  if (/^MECARD:/i.test(t)) return { kind: 'mecard', extracted: parseMecard(t) };
  if (/^https?:\/\//i.test(t)) {
    const extracted: Partial<SeedExtracted> = /linkedin\.com/i.test(t) ? { linkedin: t } : {};
    return { kind: 'url', url: t, extracted };
  }
  return { kind: 'text', text: t };
}

// ---------------------------------------------------------------------------
// Duplicados
// ---------------------------------------------------------------------------

export interface DuplicateCandidate {
  id: string;
  email?: string;
  phone?: string;
  org?: string;
  name?: string;
}

/**
 * Devuelve los ids que coinciden con el candidato por email, teléfono, o por
 * la combinación organización + nombre (todos normalizados).
 */
export function findDuplicates(
  candidate: DuplicateCandidate,
  existing: DuplicateCandidate[],
): string[] {
  const email = norm(candidate.email);
  const phone = normPhone(candidate.phone);
  const orgName = norm(candidate.org) + '|' + norm(candidate.name);
  const hasOrgName = norm(candidate.org) && norm(candidate.name);

  const matches: string[] = [];
  for (const e of existing) {
    if (e.id === candidate.id) continue;
    if (email && norm(e.email) === email) matches.push(e.id);
    else if (phone && normPhone(e.phone) === phone) matches.push(e.id);
    else if (hasOrgName && norm(e.org) + '|' + norm(e.name) === orgName) matches.push(e.id);
  }
  return matches;
}

// ---------------------------------------------------------------------------
// Semilla → hoja
// ---------------------------------------------------------------------------

/**
 * Construye los campos de una hoja a partir de una semilla al plantarla.
 * El tronco y la rama vienen de la sugerencia o de un valor por defecto.
 */
export function seedToItem(
  seed: Pick<Seed, 'extracted' | 'capturedBy' | 'eventId'>,
  seedId: string,
  fallbackTrunk: string,
): Partial<Item> {
  const ex = seed.extracted;
  const title = ex.org || ex.name || 'Nueva oportunidad';
  return {
    title,
    type: 'Cliente',
    trunk: ex.suggestedTrunk || fallbackTrunk,
    branch: ex.suggestedBranch || '',
    sector: 'Empresa',
    country: '',
    org: ex.org || '',
    description: ex.interest || '',
    stage: 'exploracion',
    stageDetail: '',
    probability: 10,
    priority: 'media',
    amount1: null,
    duration1: null,
    amount2: null,
    duration2: null,
    currency: 'USD',
    contact: ex.name || '',
    nextStep: ex.nextStep || '',
    deadline: ex.date || '',
    owners: [],
    ownerUids: [],
    support: [],
    deps: [],
    docs: [],
    steps: [],
    links: { drive: '', slack: '', jira: '' },
    source: { kind: 'semilla', seedId, eventId: seed.eventId, capturedBy: seed.capturedBy },
    visibleToVisitors: false,
    archived: false,
  };
}
