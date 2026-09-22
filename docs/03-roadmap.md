# 03. Roadmap

Regla general: ningún sprint se da por cerrado si no cumple sus pruebas de usabilidad (ver `01-producto.md`).

Cada sprint termina con una demo en celular real y un criterio de aceptación verificable. Orden de prioridad:

1. Que el equipo lo use.
2. Que se alimente solo.
3. Que la IA ayude.

## Sprint 0: Cimientos

**Tareas**

- Monorepo (`web`, `functions`, `shared`, `scripts`) con TypeScript estricto, ESLint y Prettier.
- `firebase.json` y `.firebaserc` con `pando-dev`, más los emuladores de Auth, Firestore, Functions, Storage y Hosting.
- Login con Google. Reglas iniciales:
  - Un usuario sin documento en `users` o con rol `pendiente` ve la pantalla "Tu acceso está pendiente".
  - Primer arranque: una function `bootstrapAdmin` asigna rol `ceo` al email indicado por variable de entorno, una sola vez.
- `/shared`: etapas, roles, matriz de permisos y tipos de `Item`, `Seed` y `User`.
- CI en GitHub Actions: lint, tests y tests de reglas contra el emulador.
- Scripts `dev`, `emulators`, `test` y `seed:dev`.
- i18n configurado (es, en, pt) con archivos de traducción. Ningún texto de UI queda escrito directamente en el código.

**Aceptación**

- El usuario entra con su Google en `pando-dev` y ve una pantalla vacía con su rol.
- La CI está en verde.

## Sprint 1: Pando usable (paridad con el prototipo)

**Tareas**

- Migración de `seed/items.json`, con reporte de owners sin mapear.
- Vistas Árbol, Tablero, Lista y Agenda, y la ficha completa, fieles al prototipo.
- Permisos reales por rol:
  - Reglas de Firestore y tests de reglas para cada fila de la matriz de `01-producto.md`.
  - UI adaptada al rol.
- Admin de usuarios: invitar por email, asignar rol y alias (custom claims).
- `activity` y `auditLog` generados por triggers.
- `public/summary` y la vista Visitante.
- Pantallas de inicio por rol (ver "Usabilidad" en `01-producto.md`).
- Árbol plegado por defecto, con búsqueda que salta a la oportunidad y recorrido por niveles en el celular.
- Textos de UI en lenguaje simple, en los tres idiomas.
- PWA instalable: manifest, íconos y modo standalone.
- Despliegue a `pando-prod` con confirmación.

**Aceptación**

- El CEO invita a 3 personas con roles distintos y cada una ve y puede exactamente lo que dice la matriz.
- Un visitante no puede leer `items` ni desde la consola del navegador (verificado con test de reglas).
- Pruebas de usabilidad con 3 personas reales: se cumplen los criterios del visitante, del vendedor y de la persona nueva.

## Sprint 2: Semillas (captura en conferencias)

**Tareas**

- Pantalla de captura móvil:
  - Grabar audio.
  - Escanear QR con `BarcodeDetector`, con fallback a `@zxing/browser`.
  - Foto de tarjeta.
  - Selector de evento activo.
- Cola offline: IndexedDB con reintento, y subida a Storage al recuperar la conexión.
- Function `processSeed`:
  - Speech-to-Text v2 multilenguaje (es, en, pt).
  - Parser de vCard y MECARD.
  - Extracción con Claude (JSON validado con zod, incluyendo confianza).
  - Visión para tarjetas.
  - Propuesta de tronco, rama y responsable.
- Pantalla de confirmación: ficha extraída editable con un toque.
- Semillero:
  - Lista de pendientes.
  - Acciones plantar, descartar y fusionar.
  - Detección de duplicados por email, teléfono u organización.
- Borrador de seguimiento a 24 horas, que el advisor aprueba y copia o envía por email.
- Métricas básicas por evento y por advisor.

**Aceptación**

- Un advisor en su celular, sin conexión, dicta un contacto en inglés.
- Al recuperar la conexión, la semilla aparece en el semillero con nombre, organización e interés correctos en al menos 8 de 10 pruebas.
- Plantarla crea una hoja con `source.kind = 'semilla'`.

## Sprint 3: Slack y WhatsApp

**Slack**

- App con bot, instalada en el workspace.
- Avisos por excepción:
  - cambio de etapa,
  - deadline a 48 horas o vencido,
  - comentario en una hoja propia,
  - dependencia destrabada,
  - semillas nuevas para triage.
- Resumen del lunes a las 9:00 (hora de Buenos Aires) en un canal configurable.
- Comandos: `/pando buscar <texto>`, `/pando paso <hoja> "<texto>" <fecha>`, `/pando semilla <texto>`.
- Acción de mensaje "Enviar a Pando", que crea un comentario o una semilla.
- DM al bot, que crea una semilla.

**WhatsApp**

- Webhook de WhatsApp Business Platform.
- El usuario se identifica por `users.whatsappPhone`. Un número desconocido recibe una respuesta amable y no se crea nada.
- Audio, imagen, vCard y texto entrantes generan una semilla a través de `processSeed`.
- Respuesta de confirmación con los datos extraídos y un link a la semilla.

**Aceptación**

- Un advisor manda un audio por WhatsApp y en menos de 1 minuto recibe la confirmación con los datos.
- El resumen del lunes llega al canal.

## Sprint 4: Jira

**Tareas**

- Configuración: proyecto de Jira y plantillas de épica por tipo de hoja (por ejemplo, PoC de Wizor Safety, Lunar Mission o I+D).
- Al pasar a etapa `poc`, o manualmente con "Crear épica", se crean la épica y las tareas de plantilla, y se guarda `jira.epicKey`.
- Webhook de Jira que actualiza `jira.done/total/blocked` y marca como listos los documentos asociados a tareas cerradas.
- Una hoja con tareas bloqueadas se marca en riesgo en el árbol y dispara un aviso en Slack.
- Vista de capacidad: PoC activas y tareas abiertas por persona.

**Aceptación**

- Mover CNH SSO Brasil a PoC crea la épica.
- Al cerrar tareas en Jira, el avance en la ficha se actualiza en menos de 1 minuto.

## Sprint 5: Red de contactos

**Tareas**

- Pantalla "Mi red" con el aviso de privacidad y la política de salida en la primera carga.
- Importadores:
  - Google Contacts (People API, solo lectura, OAuth por usuario, sincronización incremental).
  - LinkedIn `Connections.csv`.
  - vCard.
  - CSV o Excel con mapeo de columnas.
- Deduplicación dentro de la red de cada persona.
- Colección `orgs`, con normalización y alias. Se vinculan también las organizaciones de las oportunidades existentes.
- Niveles de privacidad (general y por contacto) y generación de `connections`.
- Motor de coincidencias: caminos directos, por cargo y por organización cercana, con embeddings y búsqueda vectorial.
- Sección "Quién puede ayudar" en la ficha e ícono de puerta abierta en el árbol.
- Pedidos de presentación con aviso en Slack al dueño del contacto.
- Sugerencias por evento o viaje, y reporte de patrones y huecos. Este último solo con datos agregados.

**Aceptación**

- Martín importa su CSV de LinkedIn y otra persona ve "Martín conoce a alguien en Petrobras" solo si Martín eligió el nivel conexión.
- Con nivel privado, nadie más ve nada, verificado con test de reglas.
- Un pedido de presentación llega al dueño y su respuesta vuelve a quien lo pidió.
- Borrar la red elimina todo rastro en menos de 1 minuto.

## Sprint 6: Reuniones y agente de IA

**Reuniones**

- Agendar desde la ficha crea un evento en Google Calendar con Meet y la agenda en la descripción. El id se vincula a la reunión.
- Asociación automática de eventos existentes por dominio de los invitados, contacto o etiqueta `[pando:itemId]` en el título.
- Obtención de grabación, transcripción y notas de Gemini desde la API de Google Meet y Drive (verificar el estado actual de esas APIs).
- Resumen estructurado con Claude: decisiones, compromisos, objeciones, próximos pasos y señales. Los pasos se proponen para aprobar.
- Política de grabación: aviso en la invitación. Si no hay grabación, se ofrece cargar notas o una nota de voz, y la IA las ordena igual.

**Agente, nivel 1 y 2**

- Revisión diaria (Scheduler) que genera `suggestions`:
  - hojas sin movimiento hace más de 14 días,
  - deadlines irreales o todos en la misma fecha,
  - sobrecarga por persona,
  - documentos faltantes antes de una reunión,
  - semillas sin triage hace más de 48 horas,
  - dependencias trabadas.
- Bandeja de sugerencias con aceptar, rechazar o posponer, y borradores de mensajes.
- El agente usa las coincidencias de la red de contactos para sugerir reuniones y alianzas, y redacta el borrador del pedido de presentación. Nunca contacta a terceros por su cuenta.

**Aceptación**

- Después de una reunión grabada con Petrobras, la ficha muestra el resumen y 3 pasos propuestos en menos de 30 minutos desde que termina la grabación.

## Sprint 7 en adelante: Autonomía gradual y extras

- Nivel 3 del agente. Se habilitan por tipo de acción desde `config/agent`, con registro y botón deshacer.
- Atajos de Siri y Google Assistant para capturar semillas.
- Exportes para inversores (PDF del resumen) y tablero de métricas de eventos.
- Presupuesto y costos de IA por mes visibles en Admin.
