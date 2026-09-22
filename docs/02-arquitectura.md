# 02. Arquitectura

## Vista general

```
 Celulares / navegadores (PWA React)
        │  Firebase Auth (Google)       Firestore (tiempo real)      Storage (audios, fotos)
        ▼
 ┌───────────────────────────── Firebase / Google Cloud ─────────────────────────────┐
 │  Firestore  ←→  Cloud Functions (triggers, HTTPS, callable, scheduler)            │
 │                   ├─ api/*            callable: captura, triage, IA a demanda      │
 │                   ├─ webhooks/slack   eventos, comandos, interacciones             │
 │                   ├─ webhooks/whatsapp mensajes entrantes (audio, foto, vCard)     │
 │                   ├─ webhooks/jira    cambios de issues                            │
 │                   ├─ meet/*           grabaciones, transcripciones, notas Gemini   │
 │                   ├─ agent/*          revisión diaria, sugerencias, tareas         │
 │                   └─ public/summary   genera la vista de visitantes                │
 │  Secret Manager · Cloud Scheduler · Speech-to-Text · Claude API                   │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

**Entornos:**

- `pando-dev`: desarrollo y pruebas.
- `pando-prod`: uso del equipo.
- Emulator Suite en local.

## Modelo de datos (Firestore)

### `users/{uid}`

```ts
{ email: string; displayName: string;
  role: 'ceo'|'cofounder'|'chief'|'pm'|'vendedor'|'colaborador'|'advisor'|'visitante'|'pendiente';
  alias: string[];            // nombres usados en la planilla, p.ej. ["Martin"], para mapear owners
  slackUserId?: string; jiraAccountId?: string; whatsappPhone?: string; // E.164, para identificar capturas
  active: boolean; invitedBy?: string; createdAt: Timestamp }
```

El rol se copia también como **custom claim** (`role`) mediante una function al cambiar, para que las reglas de seguridad lo lean sin costo.

### `items/{itemId}`: hojas

Tiene la forma de `seed/items.json`, más estos campos:

```ts
{ title, type, trunk, branch, sector, country, org, description,
  stage, stageDetail, probability, priority: 'alta'|'media'|'baja',
  amount1: number|null, duration1: number|null, amount2: number|null, duration2: number|null,
  currency: 'USD', funding, forecast,
  contact, decisionMaker, intermediary, support: string[],
  owners: string[],           // nombres visibles (compatibilidad con la planilla)
  ownerUids: string[],        // fuente de verdad para permisos
  nextStep, deadline: 'YYYY-MM-DD'|'',
  kpis, notes,
  steps: { id, text, owner, ownerUid?, due, done, after?: stepId }[],
  docs:  { id, name, status: 'falta'|'curso'|'listo', url }[],
  deps: itemId[],
  links: { drive, slack, jira },
  jira?: { epicKey, done, total, blocked, syncedAt },
  source?: { kind: 'planilla'|'manual'|'semilla', seedId?, eventId?, capturedBy? },
  visibleToVisitors: boolean, archived: boolean, order: number,
  createdAt, createdBy, updatedAt, updatedBy }
```

Subcolecciones:

- `items/{id}/comments/{cid}`: `{ by: uid, text, at, via: 'app'|'slack'|'whatsapp'|'agent' }`
- `items/{id}/meetings/{mid}`: `{ title, date, time, attendees[], agenda, calendarEventId?, meetConferenceId?, recordingUrl?, transcriptDocId?, summary?: { decisions[], commitments[], objections[], nextSteps[], signals[] }, status }`
- `items/{id}/activity/{aid}`: cambios relevantes (etapa, montos, responsables), generados por un trigger.

### `seeds/{seedId}`: semillas

```ts
{ status: 'pendiente'|'plantada'|'descartada'|'fusionada',
  capturedBy: uid, capturedAt, channel: 'voz'|'qr'|'foto'|'whatsapp'|'slack'|'manual',
  eventId?, geo?: { lat, lng, city?, country? },
  raw: { audioPath?, imagePath?, qrText?, vcard?, text?, transcript? },
  extracted: { name?, role?, org?, email?, phone?, linkedin?, interest?, nextStep?, date?,
               suggestedTrunk?, suggestedBranch?, suggestedOwner?, confidence },
  plantedItemId?, followUp?: { draft, status: 'borrador'|'aprobado'|'enviado' } }
```

### Red de contactos

- `users/{uid}/contacts/{contactId}`: **privado del dueño.** Nadie más lo lee, tampoco los admins. Solo lo procesa el backend (Admin SDK).
  ```ts
  { name, org, orgId?, role, email?, phone?, linkedin?, city?, country?,
    sources: ('google'|'linkedin'|'vcard'|'csv'|'semilla'|'reunion')[], externalIds: { google?, linkedinUrl? },
    visibility: 'privado'|'conexion'|'compartido', strength: 'conocido'|'buena'|'cercano'|null,
    lastInteractionAt?, embedding?: Vector, importedAt, updatedAt }
  ```
- `users/{uid}/networkSettings`: nivel de privacidad por defecto, fuentes conectadas y fecha de la última sincronización.
- `orgs/{orgId}`: organizaciones normalizadas, compartidas por contactos y oportunidades. Por ejemplo, "YPF S.A.", "YPF" e "YPF Luz" se agrupan con alias.
  ```ts
  { name, aliases[], domain?, sector?, country?, parentOrgId?, relatedOrgIds[], embedding?: Vector }
  ```
- `connections/{id}`: **índice visible para el equipo,** generado por el backend a partir de los contactos con nivel `conexion` o `compartido`.
  ```ts
  { ownerUid, orgId, roleSummary, city?, country?, strength, contactName?, contactRole? }
  ```
  `contactName` y `contactRole` se completan solo si el nivel es `compartido`. Email y teléfono nunca se copian.
- `matches/{itemId}`: caminos calculados para cada oportunidad, que se regeneran cuando cambian la oportunidad o las redes.
  ```ts
  { paths: [{ kind: 'directo'|'cargo'|'org_cercana', ownerUid, connectionId?, orgId, score, explanation }], computedAt }
  ```

  Cuando el camino pasa por un contacto privado, se guarda en `users/{uid}/privateMatches/{itemId}` y solo lo ve su dueño.
- `introRequests/{id}`: pedidos de presentación.
  ```ts
  { itemId, requesterUid, ownerUid, connectionId, message, status: 'pendiente'|'aceptado'|'otro_camino'|'rechazado', createdAt, answeredAt? }
  ```

### Otras colecciones

- `events/{eventId}`: `{ name, city, country, start, end, createdBy }`. Además, `users/{uid}.activeEventId` guarda el evento activo del advisor.
- `config/taxonomy`: `{ trunks: [{ name, order, slackChannel? }], branches: [{ trunk, name, order }] }`
- `config/agent`: niveles de autonomía por tipo de acción (ver `04-integraciones.md`).
- `config/integrations`: mapeos no secretos, como canales, proyecto de Jira y plantillas.
- `suggestions/{sid}`: propuestas del agente `{ itemId?, seedId?, kind, text, action?, status: 'nueva'|'aceptada'|'rechazada'|'ejecutada', createdAt }`
- `auditLog/{id}`: `{ actor: { type: 'user'|'agent'|'integration', id }, action, path, before?, after?, at }`
- `public/summary`: documento único regenerado por un trigger en cada cambio de `items`, con debounce. Es lo único que lee el rol visitante.

### Índices

Consultas previstas:

- `items`, por `trunk + stage`.
- `items`, por `ownerUids` (array-contains) + `deadline`.
- `seeds`, por `status + capturedAt`.
- `suggestions`, por `status + createdAt`.

## Seguridad

Ver `firestore.rules` (borrador).

- Los permisos se leen del custom claim `role` y de `ownerUids`.
- Validaciones que se hacen en reglas:
  - **Campos editables por rol.** El colaborador solo puede cambiar `steps` y `updatedAt`/`updatedBy`.
  - **Eliminación**, restringida a CEO y cofounder.
  - **Semillas:** cualquier rol salvo visitante puede crear una propia.
- Todo lo que implique lógica compleja pasa por **callable functions** que validan de nuevo:
  - plantar una semilla,
  - cambiar roles,
  - acciones del agente,
  - salidas a Slack, Jira o WhatsApp.
- **Storage:** `seeds/{uid}/...`. Solo el autor y los roles de triage pueden leer. Tamaños máximos: 10 MB de audio y 8 MB de imagen.
- **Webhooks:** validar siempre la firma.
  - Slack: signing secret.
  - WhatsApp: `X-Hub-Signature-256`.
  - Jira: secreto del webhook.
- **Idempotencia:** guardar los ids de eventos procesados en `integrationEvents/{source}_{eventId}` con TTL.
- **Red de contactos:**
  - Las reglas bloquean `users/{uid}/contacts` a todo el que no sea el dueño.
  - Toda exposición al equipo pasa por `connections`, generado en el servidor según el nivel elegido.
  - Los archivos importados (CSV, VCF) se procesan y se borran de Storage en menos de 24 horas.
  - Borrar la red elimina contactos, conexiones, coincidencias y embeddings asociados.
- **Grabaciones de Meet:** no se copian. Se guarda el enlace de Drive, y el acceso lo controla Drive. La IA lee la transcripción con una cuenta de servicio.

## Motor de coincidencias (red de contactos)

1. **Normalización.** Se limpian nombres de organizaciones y se asocian a `orgs` por dominio de email, alias y similitud. Cuando no hay certeza, la IA desambigua.
2. **Embeddings.** Se generan para cargos y organizaciones, y se consultan con la búsqueda vectorial de Firestore. Así "Jefe de Seguridad e Higiene" se asocia con "HSE Manager".
3. **Puntaje de cada camino.** Se combinan:
   - tipo de coincidencia (directa > cargo > organización cercana),
   - fortaleza de la relación,
   - recencia,
   - etapa y prioridad de la oportunidad.
4. **Explicación.** Claude redacta una frase corta para cada sugerencia, y solo con datos que el destinatario tiene permiso de ver.
5. **Recálculo.** Hay un trigger al cambiar una oportunidad o importar contactos, y una revisión nocturna de patrones y huecos.

## Secretos (Secret Manager, vía `defineSecret`)

- `ANTHROPIC_API_KEY`
- `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`
- `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`
- `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_WEBHOOK_SECRET`
- Google APIs (Speech, Drive, Meet, Calendar): cuentas de servicio con IAM, sin claves en archivos. Para Meet/Drive/Calendar se usa delegación de dominio autorizada por el admin de Workspace.

## Migración inicial

El script `scripts/seed.ts` lee `seed/items.json` (el id del documento es la clave del objeto) y hace `set` en `items`. Además:

- Mapea `owners` → `ownerUids` usando `users.alias`. Los nombres sin match quedan listados en un reporte para asignar a mano.
- Crea `config/taxonomy` a partir de los troncos y ramas existentes.
- Es idempotente, así que puede correrse más de una vez.
