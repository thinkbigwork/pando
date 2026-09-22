/**
 * processSeed: al crearse una semilla, completa `extracted` con lo que se puede
 * parsear localmente (QR/vCard/MECARD). La transcripción de audio (Speech-to-Text)
 * y la extracción con IA de texto/tarjetas se enganchan acá cuando estén las
 * claves (ANTHROPIC_API_KEY, Speech-to-Text). Ver docs/04-integraciones.md.
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { getFirestore } from 'firebase-admin/firestore';
import { parseQr, parseVCard, type SeedExtracted } from '@pando/shared';
import { REGION } from './config.js';

function alreadyExtracted(ex: Partial<SeedExtracted> | undefined): boolean {
  return !!(ex && (ex.name || ex.org || ex.email || ex.phone));
}

export const processSeed = onDocumentCreated(
  { document: 'seeds/{seedId}', region: REGION },
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const data = snap.data();
    const ex = (data.extracted ?? {}) as Partial<SeedExtracted>;
    if (alreadyExtracted(ex)) return; // ya vino con datos (p.ej. QR parseado en el cliente)

    const raw = (data.raw ?? {}) as Record<string, string | undefined>;
    let parsed: Partial<SeedExtracted> | null = null;

    if (raw.qrText) {
      const q = parseQr(raw.qrText);
      if ('extracted' in q) parsed = q.extracted;
    } else if (raw.vcard) {
      parsed = parseVCard(raw.vcard);
    }
    // raw.text / audio / imagen: requieren IA o Speech-to-Text (pendiente de clave).

    if (!parsed || Object.keys(parsed).length === 0) {
      logger.info('processSeed: sin extracción local; pendiente de IA', {
        seedId: event.params.seedId,
        channel: data.channel,
      });
      return;
    }

    const merged: Partial<SeedExtracted> = { ...parsed, ...ex, confidence: ex.confidence || 0.5 };
    await getFirestore()
      .doc(`seeds/${event.params.seedId}`)
      .set({ extracted: merged }, { merge: true });
    logger.info('processSeed: extracción local aplicada', { seedId: event.params.seedId });
  },
);
