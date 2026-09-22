# 04. Integraciones y agente

Patrón común: entrada (webhook con firma validada) → normalización → escritura en Firestore → salidas disparadas por triggers. Todas las integraciones son idempotentes y quedan registradas en `auditLog`. Antes de implementar cada una, verificar la documentación oficial vigente.

## Slack

- **Scopes del bot** (mínimos):
  - `chat:write`, `commands`, `im:history`, `im:write`
  - `users:read`, `users:read.email` (para mapear usuarios por email)
  - `channels:read`
- **Endpoints:**
  - `POST /webhooks/slack/events`: mensajes directos al bot.
  - `POST /webhooks/slack/commands`: `/pando`.
  - `POST /webhooks/slack/interactions`: acciones de mensaje y botones.
- **Mensajes:** Block Kit con botones "Abrir en Pando", "Marcar paso hecho" y "Posponer".
- **Reglas de ruido:**
  - Como máximo un aviso por hoja por día, salvo que el deadline venza hoy.
  - Los resúmenes se agrupan.
- **Canal por tronco:** `config/taxonomy.trunks[].slackChannel`. Los mensajes directos van al responsable usando `users.slackUserId`.

## WhatsApp (WhatsApp Business Platform, Cloud API)

- Número dedicado de Wizor.
- Webhook:
  - `GET /webhooks/whatsapp`: verificación con `WHATSAPP_VERIFY_TOKEN`.
  - `POST /webhooks/whatsapp`: mensajes entrantes, con validación de `X-Hub-Signature-256`.
- **Tipos soportados:**
  - `audio`: se descarga el medio y se transcribe.
  - `image`: tarjeta, se procesa con visión.
  - `contacts`: vCard, se parsea.
  - `text`: se procesa con extracción.
- **Respuestas:** solo dentro de la ventana de 24 horas que abre el mensaje del usuario, así que no hacen falta plantillas para confirmar. Los avisos proactivos por WhatsApp quedan fuera de alcance, porque requerirían plantillas aprobadas.

## Jira (Cloud)

- API REST v3. Autenticación con token de API y email, o con OAuth 2.0 (3LO) si se prefiere.
- **Crear épica:** tipo `Epic` en el proyecto configurado, con subtareas o issues vinculadas según la plantilla. Se guarda `epicKey` en la hoja.
- **Webhook:** eventos `jira:issue_updated` y `jira:issue_created`, filtrados con JQL por `parent = <epicKey>`. Se recalculan `done/total/blocked`.
- **Plantillas** en `config/integrations.jiraTemplates`, editables desde Admin.

## Google Workspace (Calendar, Meet, Drive)

- Cuenta de servicio con **delegación de dominio**, autorizada por el admin en la consola de Workspace.
- **Scopes:** los mínimos para leer y crear eventos de Calendar, leer registros de conferencia, grabaciones y transcripciones de Meet, y leer archivos de Drive de las reuniones. Confirmar los nombres exactos de los scopes en la documentación actual.
- **Flujo:**
  1. Al crear una reunión desde Pando, se crea el evento con `conferenceData` (Meet) y la etiqueta `[pando:itemId]`.
  2. Al terminar, se obtienen el registro de conferencia, la transcripción y las notas (Workspace Events API o polling programado).
  3. Se genera el resumen y se guarda en `meetings/{mid}`.
- Las grabaciones **no se copian**: se guarda el link de Drive y rigen los permisos de Drive.

## Red de contactos

- **Google Contacts:** People API con OAuth del propio usuario (no delegación de dominio, porque son sus contactos personales), scope de solo lectura de contactos y `syncToken` para cambios incrementales. El usuario puede desconectarla cuando quiera.
- **LinkedIn:** solo el archivo que el usuario exporta de su cuenta. LinkedIn no ofrece una API de conexiones para este uso, y el scraping viola sus términos, así que no se hace.
  - El CSV trae nombre, apellido, URL, email (a veces vacío), empresa, cargo y fecha de conexión.
  - Suele incluir unas líneas de aviso antes del encabezado, que el parser debe saltar.
- **vCard y CSV:** se parsean en el servidor con validación y límite de tamaño.
- **El agente:** puede leer coincidencias y conexiones con los permisos de quien recibe la sugerencia. Nunca escribe a contactos externos ni envía pedidos de presentación sin aprobación humana.

## Captura de semillas

- **Voz:** Speech-to-Text v2 con modelo multilenguaje (es-AR, en-US, pt-BR) y diarización opcional.
- **Extracción:** Claude, con un prompt que exige JSON estricto validado con zod: `{ name, role, org, email, phone, linkedin, interest, nextStep, date, suggestedTrunk, suggestedBranch, suggestedOwner, confidence }`. Se le pasan los troncos y ramas vigentes y la lista de responsables.
- **Tarjeta:** Claude con imagen.
- **QR:** parseo local de vCard y MECARD. Una URL se guarda como link. Si hay texto, pasa a extracción.
- **Duplicados:** coincidencia por email, teléfono o `org + name` normalizados, con propuesta de fusión.

## Agente de IA

Un proceso servidor (Scheduler diario más triggers de eventos relevantes) que lee el estado y escribe **sugerencias**. Nunca actúa fuera de lo que habilite `config/agent`.

**Niveles de autonomía por tipo de acción:**

| Nivel | Qué hace | Ejemplos |
|---|---|---|
| 1. Observa y sugiere | Crea `suggestions` | Hoja estancada, deadlines irreales, sobrecarga, dependencias trabadas |
| 2. Prepara borradores | Crea borradores que un humano aprueba | Email de seguimiento, agenda de reunión, resumen para inversores, pasos propuestos |
| 3. Ejecuta (bajo riesgo, reversible) | Escribe directamente, con registro y deshacer | Recordatorios en Slack, resumen del lunes, sincronizar avance de Jira, crear épica de plantilla, adjuntar resumen de reunión |

**Siempre con aprobación humana, sin importar la configuración:**

- enviar mensajes a clientes o gobiernos,
- cambiar montos, etapa o responsables,
- eliminar o archivar,
- cambiar la visibilidad para visitantes,
- cualquier acción sobre roles y permisos.

**Implementación:**

- Claude API con tool use. Cada herramienta es una function interna que vuelve a validar permisos como si fuera un usuario con rol `agente`.
- Presupuesto de tokens diario configurable.
- Cada ejecución queda en `auditLog`, con el razonamiento resumido.
