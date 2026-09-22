/**
 * Tipos de dominio compartidos. Ver docs/02-arquitectura.md.
 *
 * Nota sobre fechas: los deadlines y fechas de pasos son strings ISO
 * `YYYY-MM-DD`. Los timestamps de auditoría son del backend (Firestore
 * Timestamp); acá se tipan como `IsoDateTime` (string ISO) para que el tipo
 * sea agnóstico del SDK y sirva igual en web y en functions.
 */

import type { Role } from './roles.js';
import type { StageKey } from './stages.js';

/** Fecha sin hora, ISO `YYYY-MM-DD`. Cadena vacía = sin fecha. */
export type IsoDate = string;
/** Fecha y hora ISO 8601. */
export type IsoDateTime = string;

export type Priority = 'alta' | 'media' | 'baja';
export type DocStatus = 'falta' | 'curso' | 'listo';

// ---------------------------------------------------------------------------
// users/{uid}
// ---------------------------------------------------------------------------

export interface User {
  email: string;
  displayName: string;
  role: Role;
  /** Nombres usados en la planilla, p.ej. ["Martin"], para mapear owners. */
  alias: string[];
  slackUserId?: string;
  jiraAccountId?: string;
  /** E.164, para identificar capturas por WhatsApp. */
  whatsappPhone?: string;
  active: boolean;
  invitedBy?: string;
  /** Evento activo del advisor. */
  activeEventId?: string;
  createdAt: IsoDateTime;
}

// ---------------------------------------------------------------------------
// items/{itemId}: hojas (oportunidades)
// ---------------------------------------------------------------------------

export interface Step {
  id: string;
  text: string;
  owner: string;
  ownerUid?: string;
  due: IsoDate;
  done: boolean;
  /** Depende de otro paso (su id). */
  after?: string;
}

export interface ItemDoc {
  id: string;
  name: string;
  status: DocStatus;
  url: string;
}

export interface ItemLinks {
  drive: string;
  slack: string;
  jira: string;
}

export interface JiraLink {
  epicKey: string;
  done: number;
  total: number;
  blocked: number;
  syncedAt: IsoDateTime;
}

export interface ItemSource {
  kind: 'planilla' | 'manual' | 'semilla';
  seedId?: string;
  eventId?: string;
  capturedBy?: string;
}

export interface Item {
  title: string;
  type: string;
  trunk: string;
  branch: string;
  sector: string;
  country: string;
  org: string;
  description: string;
  stage: StageKey;
  stageDetail: string;
  probability: number;
  priority: Priority;
  /** Montos en USD como enteros. `null` = sin monto asignado (no es cero). */
  amount1: number | null;
  duration1: number | null;
  amount2: number | null;
  duration2: number | null;
  currency: 'USD';
  funding: string;
  forecast: string;
  contact: string;
  decisionMaker: string;
  intermediary: string;
  support: string[];
  /** Nombres visibles (compatibilidad con la planilla). */
  owners: string[];
  /** Fuente de verdad para permisos. */
  ownerUids: string[];
  nextStep: string;
  deadline: IsoDate;
  kpis: string;
  notes: string;
  steps: Step[];
  docs: ItemDoc[];
  /** Ids de otras hojas que deben avanzar antes que esta. */
  deps: string[];
  links: ItemLinks;
  jira?: JiraLink;
  source?: ItemSource;
  visibleToVisitors: boolean;
  archived: boolean;
  order: number;
  createdAt: IsoDateTime;
  createdBy?: string;
  updatedAt: IsoDateTime;
  updatedBy?: string;
}

// ---------------------------------------------------------------------------
// seeds/{seedId}: semillas (contactos nuevos)
// ---------------------------------------------------------------------------

export type SeedStatus = 'pendiente' | 'plantada' | 'descartada' | 'fusionada';
export type SeedChannel = 'voz' | 'qr' | 'foto' | 'whatsapp' | 'slack' | 'manual';

export interface SeedExtracted {
  name?: string;
  role?: string;
  org?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  interest?: string;
  nextStep?: string;
  date?: IsoDate;
  suggestedTrunk?: string;
  suggestedBranch?: string;
  suggestedOwner?: string;
  /** 0-1: confianza de la extracción. */
  confidence: number;
}

export interface Seed {
  status: SeedStatus;
  capturedBy: string;
  capturedAt: IsoDateTime;
  channel: SeedChannel;
  eventId?: string;
  geo?: { lat: number; lng: number; city?: string; country?: string };
  raw: {
    audioPath?: string;
    imagePath?: string;
    qrText?: string;
    vcard?: string;
    text?: string;
    transcript?: string;
  };
  extracted: SeedExtracted;
  plantedItemId?: string;
  followUp?: { draft: string; status: 'borrador' | 'aprobado' | 'enviado' };
}

// ---------------------------------------------------------------------------
// config/taxonomy
// ---------------------------------------------------------------------------

export interface Taxonomy {
  trunks: { name: string; order: number; slackChannel?: string }[];
  branches: { trunk: string; name: string; order: number }[];
}
