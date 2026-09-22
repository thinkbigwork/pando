/**
 * seed:dev — carga de datos semilla.
 *
 * SPRINT 0: stub. Lee `seed/items.json`, valida que se pueda parsear y muestra
 * un resumen. La migración real (mapeo owners → ownerUids con `users.alias`,
 * separación de `comments`/`meetings` a subcolecciones, creación de
 * `config/taxonomy` y reporte de owners sin match) se implementa en el Sprint 1,
 * según docs/02-arquitectura.md ("Migración inicial"). Es idempotente por diseño.
 *
 * Uso (Sprint 1 en adelante): apuntar a emulador o a pando-dev vía
 * GOOGLE_APPLICATION_CREDENTIALS / FIRESTORE_EMULATOR_HOST y correr `npm run seed:dev`.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const itemsPath = resolve(here, '../../seed/items.json');

async function main(): Promise<void> {
  const raw = await readFile(itemsPath, 'utf8');
  const items = JSON.parse(raw) as Record<string, { title: string; trunk: string }>;
  const ids = Object.keys(items);

  const trunks = new Set(ids.map((id) => items[id].trunk));

  console.log(`seed:dev (stub del Sprint 0)`);
  console.log(`  Oportunidades en seed/items.json: ${ids.length}`);
  console.log(`  Troncos distintos: ${trunks.size}`);
  console.log('');
  console.log('  La escritura real en Firestore se implementa en el Sprint 1.');
  console.log('  No se escribió nada.');
}

main().catch((err) => {
  console.error('seed:dev falló:', err);
  process.exit(1);
});
