/**
 * Triggers de Firestore sobre `items`:
 * - rebuildSummary: regenera `public/summary` (única lectura del visitante).
 * - recordActivity: registra cambios relevantes en `items/{id}/activity` y en
 *   `auditLog`. Ver docs/02-arquitectura.md.
 */

import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { REGION } from './config.js';
import { buildSummary, type SummaryInputItem } from './summaryModel.js';

export const rebuildSummary = onDocumentWritten(
  { document: 'items/{itemId}', region: REGION },
  async () => {
    const db = getFirestore();
    const snap = await db.collection('items').get();
    const items: SummaryInputItem[] = snap.docs.map((d) => {
      const x = d.data();
      return {
        id: d.id,
        title: x.title ?? '',
        description: x.description ?? '',
        trunk: x.trunk ?? 'Sin línea',
        stage: x.stage,
        amount1: x.amount1 ?? null,
        archived: x.archived ?? false,
        visibleToVisitors: x.visibleToVisitors ?? false,
        order: x.order ?? 0,
      };
    });
    const summary = buildSummary(items, new Date().toISOString());
    await db.doc('public/summary').set(summary);
    logger.info('public/summary regenerado', { count: summary.total.count });
  },
);

const TRACKED = ['stage', 'amount1', 'amount2', 'priority', 'deadline', 'archived'] as const;

export const recordActivity = onDocumentWritten(
  { document: 'items/{itemId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return; // borrado: no se registra actividad (delete va por auditoría propia)

    const changes: Record<string, { from: unknown; to: unknown }> = {};
    for (const k of TRACKED) {
      const b = before?.[k];
      const a = after[k];
      if (JSON.stringify(b) !== JSON.stringify(a)) changes[k] = { from: b ?? null, to: a ?? null };
    }
    // owners (array)
    if (JSON.stringify(before?.owners ?? []) !== JSON.stringify(after.owners ?? [])) {
      changes.owners = { from: before?.owners ?? [], to: after.owners ?? [] };
    }

    if (!before) {
      // creación
      changes.created = { from: null, to: true };
    }
    if (Object.keys(changes).length === 0) return;

    const db = getFirestore();
    const itemId = event.params.itemId;
    const actor = (after.updatedBy as string) || (after.createdBy as string) || 'desconocido';

    await db.collection('items').doc(itemId).collection('activity').add({
      changes,
      by: actor,
      at: FieldValue.serverTimestamp(),
    });
    await db.collection('auditLog').add({
      actor: { type: 'user', id: actor },
      action: before ? 'item.update' : 'item.create',
      path: `items/${itemId}`,
      after: changes,
      at: FieldValue.serverTimestamp(),
    });
  },
);
