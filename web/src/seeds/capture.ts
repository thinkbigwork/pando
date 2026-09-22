/**
 * Captura de semillas: crea el documento en `seeds` y sube el medio (audio/foto)
 * a Storage. Si no hay conexión, encola en IndexedDB para reintentar.
 * La extracción (IA/transcripción) la hace el backend (processSeed).
 */

import { addDoc, collection } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import { enqueue, type QueuedCapture } from './queue';

export interface SeedInput {
  channel: QueuedCapture['channel'];
  eventId?: string;
  raw: Record<string, unknown>;
  extracted?: Record<string, unknown>;
  capturedBy: string;
}

/** Crea el documento de semilla en `seeds` (status pendiente). */
export async function createSeedDoc(input: SeedInput): Promise<string> {
  const doc = await addDoc(collection(db, 'seeds'), {
    status: 'pendiente',
    capturedBy: input.capturedBy,
    capturedAt: new Date().toISOString(),
    channel: input.channel,
    ...(input.eventId ? { eventId: input.eventId } : {}),
    raw: input.raw,
    extracted: input.extracted ?? { confidence: 0 },
  });
  return doc.id;
}

/** Sube un blob (audio/foto) y crea la semilla apuntando al path de Storage. */
export async function uploadAndCreate(c: QueuedCapture, uid: string): Promise<string> {
  const raw = { ...c.raw };
  if (c.blob) {
    const ext = c.channel === 'voz' ? 'webm' : 'jpg';
    const path = `seeds/${uid}/${c.id}.${ext}`;
    const snap = await uploadBytes(ref(storage, path), c.blob);
    const url = await getDownloadURL(snap.ref);
    if (c.channel === 'voz') raw.audioPath = path;
    else raw.imagePath = path;
    raw.mediaUrl = url;
  }
  return createSeedDoc({
    channel: c.channel,
    eventId: c.eventId,
    raw,
    extracted: c.extracted,
    capturedBy: uid,
  });
}

/**
 * Envía una captura: si hay conexión la sube y crea la semilla; si no, la encola
 * para reintentar cuando vuelva la conexión.
 */
export async function submitCapture(
  c: QueuedCapture,
  uid: string,
): Promise<{ queued: boolean; seedId?: string }> {
  if (navigator.onLine) {
    try {
      const seedId = await uploadAndCreate(c, uid);
      return { queued: false, seedId };
    } catch {
      await enqueue(c);
      return { queued: true };
    }
  }
  await enqueue(c);
  return { queued: true };
}
