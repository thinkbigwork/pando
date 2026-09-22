/**
 * seed:dev — migración inicial de seed/items.json a Firestore.
 * Ver docs/02-arquitectura.md ("Migración inicial"). Es idempotente.
 *
 * Uso:
 *   npm run seed:dev -- --dry-run        # transforma y reporta, no escribe
 *   npm run seed:dev                     # escribe en Firestore
 *
 * Destino (cuando NO es dry-run):
 *   - Emulador: exportar FIRESTORE_EMULATOR_HOST (p.ej. 127.0.0.1:8080).
 *   - pando-dev: GOOGLE_APPLICATION_CREDENTIALS o `gcloud auth application-default login`,
 *     y GCLOUD_PROJECT=pando-dev (o --project pando-dev).
 *
 * Qué hace:
 *   - `set` de cada `items/{id}` (sin comments/meetings).
 *   - `comments` y `meetings` embebidos → subcolecciones `items/{id}/comments|meetings`.
 *   - Mapea owners → ownerUids con `users.alias`; los nombres sin match van al reporte.
 *   - Crea `config/taxonomy` con troncos y ramas.
 *   - Registra la corrida en `auditLog`.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { Firestore } from 'firebase-admin/firestore';
import {
  buildAliasIndex,
  buildTaxonomy,
  extractSubcollections,
  mapOwners,
  toItemDoc,
  type RawSeedItem,
  type UserForIndex,
} from './migrate/transform.js';

const here = dirname(fileURLToPath(import.meta.url));
const itemsPath = resolve(here, '../../seed/items.json');

interface Args {
  dryRun: boolean;
  project?: string;
}

function parseArgs(argv: string[]): Args {
  const dryRun = argv.includes('--dry-run');
  const pIdx = argv.indexOf('--project');
  const project = pIdx >= 0 ? argv[pIdx + 1] : process.env.GCLOUD_PROJECT;
  return { dryRun, project };
}

async function loadItems(): Promise<Record<string, RawSeedItem>> {
  const raw = await readFile(itemsPath, 'utf8');
  return JSON.parse(raw) as Record<string, RawSeedItem>;
}

function reportUnmatched(items: Record<string, RawSeedItem>, index: Map<string, string>): void {
  const perOwner = new Map<string, string[]>(); // ownerName -> itemIds
  for (const id of Object.keys(items)) {
    const { unmatched } = mapOwners(items[id].owners ?? [], index);
    for (const name of unmatched) {
      if (!perOwner.has(name)) perOwner.set(name, []);
      perOwner.get(name)!.push(id);
    }
  }
  if (perOwner.size === 0) {
    console.log('  Owners sin mapear: ninguno.');
    return;
  }
  console.log(`  Owners sin mapear (${perOwner.size}) — asignar a mano tras invitar usuarios:`);
  for (const [name, ids] of [...perOwner.entries()].sort()) {
    console.log(
      `    - ${name}: ${ids.length} hoja(s) [${ids.slice(0, 6).join(', ')}${ids.length > 6 ? '…' : ''}]`,
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const items = await loadItems();
  const ids = Object.keys(items);
  const taxonomy = buildTaxonomy(items);

  console.log(
    args.dryRun ? 'seed:dev — DRY RUN (no se escribe nada)' : 'seed:dev — escribiendo en Firestore',
  );
  console.log(`  Oportunidades: ${ids.length}`);
  console.log(`  Troncos: ${taxonomy.trunks.length} · Ramas: ${taxonomy.branches.length}`);

  // Usuarios para el índice de alias. En dry-run sin backend, queda vacío
  // (y todos los owners aparecen como "sin mapear", que es justamente el reporte).
  let users: UserForIndex[] = [];
  let db: Firestore | undefined;

  const hasBackend =
    !!process.env.FIRESTORE_EMULATOR_HOST ||
    !!process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    !!process.env.GOOGLE_CLOUD_PROJECT;

  if (!args.dryRun || hasBackend) {
    const { initializeApp, applicationDefault } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    initializeApp({
      projectId: args.project,
      ...(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault() } : {}),
    });
    db = getFirestore();
    const snap = await db.collection('users').get();
    users = snap.docs.map((d) => ({
      uid: d.id,
      displayName: d.data().displayName,
      alias: d.data().alias,
    }));
    console.log(`  Usuarios leídos para mapear owners: ${users.length}`);
  }

  const index = buildAliasIndex(users);
  reportUnmatched(items, index);

  if (args.dryRun) {
    console.log('\n  Dry run: no se escribió nada. Quitá --dry-run para migrar.');
    return;
  }
  if (!db) throw new Error('No hay conexión a Firestore.');

  const now = new Date().toISOString();
  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops > 0) {
      await batch.commit();
      batch = db!.batch();
      ops = 0;
    }
  };

  for (const id of ids) {
    const raw = items[id];
    const { ownerUids } = mapOwners(raw.owners ?? [], index);
    const itemDoc = toItemDoc(raw, ownerUids, now);
    batch.set(db.collection('items').doc(id), itemDoc);
    ops++;

    const sub = extractSubcollections(raw);
    for (const c of sub.comments) {
      batch.set(db.collection('items').doc(id).collection('comments').doc(c.id), c.data);
      ops++;
    }
    for (const m of sub.meetings) {
      batch.set(db.collection('items').doc(id).collection('meetings').doc(m.id), m.data);
      ops++;
    }
    if (ops >= 400) await flush();
  }

  batch.set(db.doc('config/taxonomy'), taxonomy);
  ops++;
  batch.set(db.collection('auditLog').doc(), {
    actor: { type: 'integration', id: 'seed:migration' },
    action: 'seed.items',
    path: 'items',
    after: { count: ids.length },
    at: now,
  });
  ops++;
  await flush();

  console.log(`\n  Listo: ${ids.length} hojas + taxonomía escritas (idempotente).`);
}

main().catch((err) => {
  console.error('seed:dev falló:', err);
  process.exit(1);
});
