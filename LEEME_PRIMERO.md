# Pando: cómo arrancar con Claude Code

Esta carpeta es el paquete completo para empezar el desarrollo. Contiene:

- `CLAUDE.md`: la memoria del proyecto. Claude Code la lee sola cada vez que abre el repositorio.
- `docs/01-producto.md`: qué es Pando, roles, vistas, semillas y glosario.
- `docs/02-arquitectura.md`: stack, estructura del repo, modelo de datos, permisos y secretos.
- `docs/03-roadmap.md`: sprints con tareas y criterios de aceptación.
- `docs/04-integraciones.md`: Slack, Jira, WhatsApp, Google Meet, captura por voz/QR y agente de IA.
- `firestore.rules`: borrador de reglas de seguridad por rol.
- `seed/items.json`: las 47 oportunidades ya normalizadas desde la planilla.
- `seed/planilla-original.xlsx`: la planilla original, como respaldo.
- `reference/prototipo-pando.html`: el prototipo funcional, como referencia visual y de comportamiento.

Lo que sigue son las tareas que tenés que hacer vos, porque requieren tu identidad o tus credenciales. Claude Code hace el resto.

## 1. Preparar tu computadora (una sola vez)

1. Instalá **Claude Code**, en la app de escritorio o por terminal.
2. Instalá **Node.js 20 LTS** o superior.
3. Instalá **Git** y configurá tu usuario de GitHub.
4. Instalá las herramientas de línea de comandos:
   - **Firebase:** `npm install -g firebase-tools`
   - **Google Cloud:** el SDK `gcloud`.
5. Iniciá sesión:
   - Firebase: `firebase login`
   - Google Cloud: `gcloud auth login` y después `gcloud auth application-default login`.

## 2. Crear el repositorio

1. En GitHub, creá un repositorio **privado** llamado `pando` dentro de la organización de Wizor.
2. Clonalo en tu computadora.
3. Copiá dentro todo el contenido de esta carpeta.
4. Hacé el primer commit: `git add . && git commit -m "Paquete inicial de Pando" && git push`.

## 3. Crear los proyectos en Google Cloud / Firebase

1. En la consola de Firebase, creá dos proyectos:
   - `pando-dev`, para desarrollo y pruebas.
   - `pando-prod`, para el equipo. Este puede esperar hasta el sprint 1.
2. Activá el plan **Blaze** (pago por uso) en `pando-dev`. Las Cloud Functions y Secret Manager lo requieren. El costo inicial es de centavos, y conviene poner una alerta de presupuesto de, por ejemplo, US$ 20.
3. En `pando-dev`, activá:
   - **Authentication** con el proveedor Google.
   - **Firestore**, en modo producción, en la región `southamerica-east1` o `us-central1`.
   - **Storage**.
   - **Hosting**.
4. Anotá el dominio de Google Workspace de Wizor (por ejemplo `wizor.com`). Claude Code te lo va a pedir.

## 3b. Dominio propio (cuando llegue el Sprint 1)

En Firebase Hosting, agregá el dominio personalizado `pando.wizor.io`. Firebase te va a dar registros DNS para cargar en el proveedor del dominio `wizor.io`. Claude Code te guía en el momento.

## 4. Cuentas de integración (podés dejarlas para cada sprint)

Claude Code te va a guiar paso a paso cuando llegue cada una. Nunca pegues una clave en el chat ni en el código: se cargan en Secret Manager con el comando que te indique Code.

| Integración | Cuándo | Qué hay que crear |
|---|---|---|
| Claude API | Sprint 2 | Una API key en console.anthropic.com |
| Speech-to-Text | Sprint 2 | Solo activar la API en Google Cloud, no requiere clave |
| Slack | Sprint 3 | Una app de Slack en api.slack.com/apps, instalada en el workspace |
| WhatsApp | Sprint 3 | Una cuenta de WhatsApp Business Platform en Meta y un número dedicado |
| Jira | Sprint 4 | Un API token de Atlassian, o una app OAuth |
| Google Meet / Drive | Sprint 5 | Una cuenta de servicio con delegación de dominio, autorizada por vos como admin |

## 5. Primer mensaje para Claude Code

Abrí Claude Code en la carpeta del repositorio y pegá esto:

```
Hola. Vamos a construir Pando, la app de seguimiento comercial de Wizor.
Leé CLAUDE.md y todos los archivos de docs/ antes de hacer nada.
Mirá reference/prototipo-pando.html para entender la experiencia esperada.
Después:
1. Resumime en 10 líneas qué entendiste y listame dudas o contradicciones que encuentres.
2. Proponé el plan detallado del Sprint 0 (ver docs/03-roadmap.md) y esperá mi OK.
El dominio de Workspace es: ____________
El proyecto Firebase de desarrollo es: pando-dev
```

## 6. Cómo trabajar sprint a sprint

1. Pedile a Code el plan del sprint y aprobalo o ajustalo.
2. Dejalo implementar. Code corre las pruebas y el emulador de Firebase en local.
3. Probá vos en tu celular la URL de desarrollo que te pase Code.
4. Cuando esté bien, pedile que haga commit y abra un pull request. Revisalo y mergealo.
5. El despliegue a producción lo hacés vos o lo aprobás explícitamente. Code nunca despliega a `pando-prod` sin tu OK.

Al terminar cada sprint, pedile a Code que actualice la sección "Estado actual" de `CLAUDE.md`. Así la próxima sesión arranca con contexto.
