/**
 * Cola offline de capturas (IndexedDB). Guarda las capturas que no se pudieron
 * subir todavía y las reintenta cuando vuelve la conexión. Degrada con
 * elegancia si IndexedDB no está disponible.
 */

export interface QueuedCapture {
  id: string;
  channel: 'voz' | 'qr' | 'foto' | 'manual';
  eventId?: string;
  /** Datos ya listos para crear la semilla (texto/QR) o metadatos del medio. */
  raw: Record<string, unknown>;
  extracted?: Record<string, unknown>;
  /** Archivo a subir (audio/foto), si aplica. */
  blob?: Blob;
  createdAt: string;
}

const DB_NAME = 'pando-capture';
const STORE = 'queue';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function hasIdb(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function enqueue(capture: QueuedCapture): Promise<void> {
  if (!hasIdb()) throw new Error('IndexedDB no disponible');
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(capture);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function list(): Promise<QueuedCapture[]> {
  if (!hasIdb()) return [];
  const db = await openDb();
  const rows = await new Promise<QueuedCapture[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedCapture[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return rows;
}

export async function remove(id: string): Promise<void> {
  if (!hasIdb()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/**
 * Vacía la cola aplicando `upload` a cada captura. Los que fallan quedan en la
 * cola para el próximo intento. Devuelve cuántas se subieron.
 */
export async function drain(upload: (c: QueuedCapture) => Promise<void>): Promise<number> {
  const rows = await list();
  let ok = 0;
  for (const c of rows) {
    try {
      await upload(c);
      await remove(c.id);
      ok++;
    } catch {
      // se reintenta más tarde
    }
  }
  return ok;
}
