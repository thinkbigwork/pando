# CLAUDE.md, proyecto Pando

Pando es la app interna de Wizor para seguir oportunidades comerciales, alianzas, fondeo y tareas. Tiene una vista principal de árbol: Wizor es la raíz, las líneas de negocio son troncos, las cuentas o programas son ramas y las oportunidades son hojas. Los contactos nuevos entran como semillas.

El nombre viene de Pando, un bosque de Utah cuyos miles de troncos brotan de una sola raíz. Subdominio: `pando.wizor.io`.

**Prioridad número uno: usabilidad.** Antes de cualquier decisión de diseño o implementación, revisá la sección "Usabilidad" de `docs/01-producto.md`. Sus reglas son requisitos, no sugerencias: la metáfora del árbol es visual y los textos son simples, cada rol tiene su pantalla de inicio, el árbol arranca plegado y la UI está en tres idiomas.

Antes de trabajar, leé `docs/01-producto.md`, `docs/02-arquitectura.md`, `docs/03-roadmap.md` y `docs/04-integraciones.md`. El prototipo `reference/prototipo-pando.html` define la experiencia esperada: lenguaje visual, colores por etapa, vistas y ficha. Reproducilo en React y mejoralo, sin cambiar su espíritu.

## Stack (decidido)

- **Frontend:** React 18 + Vite + TypeScript, como PWA instalable (vite-plugin-pwa) con soporte offline para captura de semillas. D3 para el árbol. CSS con variables (tokens del prototipo), sin framework de UI pesado.
- **Backend:**
  - Firebase: Auth (Google), Firestore, Storage, Hosting.
  - Cloud Functions 2nd gen en Node 20 + TypeScript.
  - Cloud Scheduler para tareas periódicas.
  - Secret Manager para todas las claves.
- **IA:** Claude API (Anthropic SDK) para extracción, resúmenes y agente. Google Cloud Speech-to-Text v2 para transcripción de audio.
- **Tests:** Vitest para unidades y `@firebase/rules-unit-testing` para las reglas de Firestore, contra el Firebase Emulator Suite.

## Estructura del repo

```
/web          app React (PWA)
/functions    Cloud Functions (API, integraciones, agente)
/shared       tipos TypeScript y constantes compartidas (etapas, roles, permisos)
/scripts      migración y utilidades (seed desde seed/items.json)
/docs         especificación
firestore.rules, storage.rules, firebase.json, .firebaserc
```

## Convenciones

- La UI va en **español neutro** por defecto (preferir impersonal), más **inglés y portugués**. Todo texto de UI pasa por i18n, nunca escrito directamente en el código. El código, los nombres de variables y los commits van en inglés.
- Las etapas, roles y permisos se definen **una sola vez** en `/shared` y se usan en web, functions y tests.
- **Seguridad:**
  - Todo permiso se valida en el servidor (reglas de Firestore o functions), nunca solo en la UI.
  - Los visitantes jamás leen la colección `items`: consumen `public/summary`.
- **Montos** en USD como enteros (sin decimales). `null` significa "sin monto asignado", no cero.
- **Fechas** como string ISO `YYYY-MM-DD` para deadlines y timestamps de Firestore para auditoría.
- **Auditoría.** Toda escritura hecha por una function o por el agente se registra en `auditLog`, indicando el actor (usuario o agente), la acción y un diff mínimo.
- **Integraciones.** Todas se diseñan con el mismo patrón:
  - Una function recibe el evento externo (webhook).
  - Valida la firma.
  - Normaliza el evento.
  - Escribe en Firestore.
  - Las salidas hacia afuera (Slack, Jira, WhatsApp) se disparan con triggers de Firestore.
  - Todas deben ser idempotentes.

## Reglas de trabajo con el usuario

- Proponé el plan de cada sprint y esperá aprobación antes de implementar.
- Nunca pidas que se peguen claves en el chat ni las escribas en archivos. Usá `firebase functions:secrets:set NOMBRE` y explicá el paso.
- Nunca despliegues a `pando-prod` sin confirmación explícita. En `pando-dev` podés desplegar cuando el usuario lo pida.
- Corré tests y emuladores antes de declarar algo terminado.
- Si una API externa pudo haber cambiado (Meet, WhatsApp, Slack, Jira), verificá la documentación oficial antes de implementar.
- Al cerrar un sprint, actualizá la sección "Estado actual" de este archivo.

## Comandos

- `npm run dev`: web en modo desarrollo (contra emuladores si `VITE_USE_EMULATORS=1`).
- `npm run emulators`: Firebase Emulator Suite (Auth, Firestore, Functions, Storage, Hosting).
- `npm run lint` / `npm run format:check` / `npm run typecheck`: calidad de código.
- `npm test`: tests unitarios (Vitest) de todos los paquetes.
- `npm run test:rules`: tests de reglas de Firestore contra el emulador (requiere Java).
- `npm run build`: compila todos los paquetes.
- `npm run seed:dev`: carga de datos semilla (stub en Sprint 0; migración real en Sprint 1).

## Estado actual

- Se agregó la función "Mi red" (red de contactos), en el Sprint 5. La privacidad de las redes es un requisito central: los contactos de una persona nunca son legibles por otra.

- **Sprint 0: implementado (cimientos), pendiente de verificación en la nube.** Monorepo
  `web`/`functions`/`shared`/`scripts` con TS estricto, ESLint y Prettier. Login con Google y
  gate de acceso (pendiente / sin acceso / listo). `/shared` con etapas, roles, matriz de
  permisos y tipos, con tests. i18n es/en/pt sin texto de UI en el código. Reglas de Firestore
  y Storage + primer test de reglas. `bootstrapAdmin` y trigger `setRoleClaim`. CI en GitHub
  Actions. Región elegida: `southamerica-east1`. Dominio de Workspace: `wizor.io`. CEO
  (bootstrap): `desk@wizor.io`. Repo: `github.com/thinkbigwork/pando`.
  - **Verificado localmente:** build, typecheck, lint, formato y tests unitarios en verde.
  - **Falta (pasos del usuario):** crear el proyecto `pando-dev` en Firebase y completar
    `web/.env.local`; instalar Java para correr el emulador y `npm run test:rules` en local
    (en CI corren solos); `git push` inicial al repo; probar el login real y ver la pantalla
    vacía con el rol (criterio de aceptación del Sprint 0).
- El prototipo ya fue validado conceptualmente con el CEO.
- Los datos semilla vienen de la planilla "Seguimiento - Prospección - Pipeline". Algunas agrupaciones, sectores, países y dependencias fueron inferidos y deben revisarse con el equipo.
