# Pando

App interna de Wizor para seguir oportunidades comerciales, alianzas, fondeo y tareas.
Vista principal en forma de árbol: Wizor es la raíz, las líneas de negocio son troncos,
las cuentas o programas son ramas y las oportunidades son hojas. Subdominio: `pando.wizor.io`.

La especificación vive en [`docs/`](docs/). Empezá por [`docs/01-producto.md`](docs/01-producto.md)
(la sección **Usabilidad** manda sobre cualquier otra decisión). La memoria del proyecto para
Claude Code está en [`CLAUDE.md`](CLAUDE.md).

## Estructura

```
/web          app React (PWA)
/functions    Cloud Functions (API, integraciones, agente)
/shared       tipos y constantes compartidas (etapas, roles, permisos)
/scripts      migración y utilidades (seed)
/test         tests de reglas de Firestore
/docs         especificación
```

## Requisitos

- Node.js 20 o superior
- Firebase CLI (`npm install -g firebase-tools`)
- Java (solo para correr el emulador de Firestore)

## Puesta en marcha

```bash
npm install
cp web/.env.example web/.env.local        # completá con la config de pando-dev
cp functions/.env.example functions/.env.local
```

## Comandos

| Comando                | Qué hace                                                               |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run dev`          | App web en desarrollo (contra emuladores si `VITE_USE_EMULATORS=1`)    |
| `npm run emulators`    | Firebase Emulator Suite (Auth, Firestore, Functions, Storage, Hosting) |
| `npm run lint`         | ESLint en todo el monorepo                                             |
| `npm run format:check` | Chequeo de formato con Prettier                                        |
| `npm run typecheck`    | TypeScript en modo estricto, sin emitir                                |
| `npm test`             | Tests unitarios (Vitest) de todos los paquetes                         |
| `npm run test:rules`   | Tests de reglas de Firestore contra el emulador                        |
| `npm run build`        | Compila todos los paquetes                                             |
| `npm run seed:dev`     | Carga de datos semilla (stub en Sprint 0)                              |

## Entornos

- `pando-dev`: desarrollo y pruebas.
- `pando-prod`: uso del equipo (nunca se despliega sin confirmación explícita).

## Primer arranque (bootstrap del CEO)

1. Iniciá sesión con Google en la app una vez (crea tu usuario en Auth).
2. Con `BOOTSTRAP_ADMIN_EMAIL` configurado, invocá la function `bootstrapAdmin` una sola vez:
   asigna el rol `ceo` a ese email y lo registra en `users`.
3. Cerrá sesión y volvé a entrar para refrescar el token con el nuevo rol.
