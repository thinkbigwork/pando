# 01. Producto

## El nombre

**Pando** es un bosque de álamos temblones en Utah con decenas de miles de troncos que brotan de una sola raíz: genéticamente es un único organismo, uno de los más grandes y antiguos del planeta. "Pando" significa "me extiendo" en latín. Es la imagen de Wizor: una raíz y muchos troncos (líneas de negocio) que crecen y se expanden. Subdominio: `pando.wizor.io`.

## Propósito

Wizor lleva decenas de oportunidades en paralelo, con empresas (CNH, YPF, Petrobras), gobiernos (Cuenca, Panamá, Brasil, Oklahoma), agencias espaciales (NASA), eventos (Lunar Mission), alianzas y fondeo (Honeywell, LatamToTulsa, SAM.gov). Hoy todo vive en una planilla.

Pando reemplaza la planilla con una herramienta que:

- muestra el panorama completo en segundos,
- mantiene los datos actualizados desde donde el equipo ya trabaja (Slack, Jira, WhatsApp, Meet),
- y deja que un agente de IA supervise y, con el tiempo, ejecute tareas de bajo riesgo.

## Glosario

- **Tronco:** línea de negocio. Los iniciales son:
  - Wizor Safety en empresas
  - Gobiernos y observatorio laboral
  - Space y aeroespacial
  - Lunar Mission
  - Alianzas y fondeo
  - Corporativo e I+D
- **Rama:** cuenta o programa dentro de un tronco (CNH, NASA, Energía y minería, Sedes en EE.UU.…).
- **Hoja:** una oportunidad concreta. Es la entidad principal (`items`).
- **Semilla:** un contacto o posible oportunidad capturado rápidamente, que todavía no fue asignado a tronco ni rama. Vive en el **semillero** hasta que alguien lo planta (lo convierte en hoja) o lo descarta.
- **Paso:** una tarea dentro de una hoja, con responsable, fecha, estado y dependencia opcional de otro paso.
- **Dependencia:** una hoja que debe avanzar antes que otra.

## Etapas (en orden, cada una con su probabilidad por defecto)

| Clave | Nombre | Prob. | Color claro | Color oscuro |
|---|---|---|---|---|
| exploracion | Exploración | 10% | #C7D6A3 | igual |
| presentacion | Presentación | 20% | #97C177 | igual |
| propuesta | Propuesta | 35% | #5DA05A | igual |
| poc | PoC o piloto | 50% | #2F8A63 | igual |
| negociacion | Negociación y fondeo | 60% | #1F6A70 | igual |
| cierre | Contrato firmado | 90% | #16435E | igual |
| despliegue | Despliegue | 100% | #D8A42B | igual |
| pausado | Pausado | 0% | #A7A9A3 | igual |
| perdido | Perdido | 0% | #8E6E68 | igual |

Además de la etapa normalizada, cada hoja conserva un texto libre (`stageDetail`), por ejemplo "Tercer reunión de exploración".

La probabilidad por defecto se aplica al cambiar de etapa, pero se puede editar a mano.

## Roles y permisos

| Acción | CEO | Cofounder | Chief | PM | Vendedor | Colaborador | Advisor | Visitante |
|---|---|---|---|---|---|---|---|---|
| Ver árbol y totales | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (resumen) |
| Ver montos por hoja | ✓ | ✓ | ✓ | ✓ | ✓ | | ✓ | |
| Ver contactos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| Capturar semillas | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Triage del semillero (plantar/descartar) | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| Crear hojas | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| Editar cualquier hoja | ✓ | ✓ | ✓ | ✓ | | | | |
| Editar hojas propias | ✓ | ✓ | ✓ | ✓ | ✓ | | | |
| Marcar pasos asignados | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| Comentar | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Archivar | ✓ | ✓ | ✓ | ✓ | propias | | | |
| Eliminar | ✓ | ✓ | | | | | | |
| Gestionar usuarios y roles | ✓ | ✓ | | | | | | |
| Configurar agente e integraciones | ✓ | ✓ | | | | | | |
| Cargar su red de contactos | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Ver conexiones visibles del equipo y pedir presentaciones | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | |

Algunas precisiones:

- **"Propia"** significa que el `uid` del usuario está en `ownerUids` de la hoja.
- **Colaboradores:** además de lo que marca la tabla, solo ven los montos de las hojas donde tienen pasos asignados.
- **Visitante:** ve solo `public/summary`. Es un documento generado por el servidor con:
  - totales por tronco y etapa,
  - títulos de las hojas marcadas `visibleToVisitors`,
  - etapa y descripción corta.

  No ve contactos, montos individuales, comentarios ni reuniones.

**Acceso.** Solo por invitación. Existe una colección `users` con email y rol. Las personas del dominio de Workspace pueden entrar y quedan pendientes de rol hasta que un CEO o cofounder se lo asigne. Advisors y visitantes pueden usar cuentas Google de otros dominios si fueron invitados por email.

## Vistas

1. **Árbol** (pantalla principal).
   - Diagrama horizontal: raíz, troncos, ramas y hojas.
   - Grosor de las ramas: troncos gruesos, ramas medias y hojas finas, en color corteza.
   - Hojas:
     - El color indica la etapa (o la urgencia, con un selector).
     - El tamaño es la raíz cuadrada del monto del tramo 1.
     - Un anillo rojo indica deadline vencido y uno ámbar, deadline dentro de 7 días.
   - Troncos y ramas se pliegan con un clic y muestran la cantidad de hojas y la suma de montos.
   - Al seleccionar una hoja, sus dependencias se dibujan con línea punteada y el resto se atenúa.
   - Las semillas pendientes se muestran como un contador en la base del árbol, con acceso al semillero.
2. **Tablero:** columnas por etapa, con arrastrar y soltar para avanzar. En móvil, se cambia la etapa desde la ficha.
3. **Lista:** tabla ordenable y filtrable, con exportación a CSV para roles con montos.
4. **Agenda:** deadlines, pasos y reuniones agrupados en Vencido, Esta semana, Próximas 3 semanas y Más adelante.
5. **Semillero:** bandeja de semillas pendientes, con propuesta de tronco, rama y responsable hecha por la IA. Tiene acciones para plantar (crear la hoja o sumarla a una existente), descartar o fusionar con otra semilla.
6. **Captura** (móvil, pantalla de inicio de la PWA): un botón grande "Nueva semilla" con las opciones Hablar, Escanear QR y Foto de tarjeta, y el evento activo visible.
7. **Admin:** usuarios y roles, troncos y ramas (orden y nombres), eventos, canales de Slack por tronco, plantillas de épicas de Jira y configuración del agente.

Filtros globales: línea, sector, responsable, búsqueda de texto y "solo lo mío". Hay tema claro y oscuro según el sistema.

## Ficha de hoja (secciones)

- **Qué es:** título, tipo, sector, país, tronco, rama, organización y descripción.
- **Dónde está:** etapa, detalle de etapa, probabilidad, prioridad, deadline, próximo paso y responsables.
- **Montos:** tramo 1 (monto y meses), tramo 2 (monto y meses), fuente de fondeo, previsión y valor ponderado calculado.
- **Personas:** contacto, decisor o champion, intermediario y apoyos.
- **Pasos:** checklist con responsable, fecha y dependencia entre pasos. Incluye el botón "Sugerir pasos con IA".
- **Reuniones:** agenda previa, participantes y enlace a Google Calendar y Meet. Después de cada reunión: grabación, transcripción y resumen estructurado, con propuestas de pasos para aprobar.
- **Documentos necesarios:** nombre, estado (falta, en curso, listo) y link a Drive.
- **Dependencias:** otras hojas que deben avanzar antes que esta.
- **Seguimiento:** KPIs, comentarios internos, links a Drive, Slack y Jira, y "visible para visitantes".
- **Actividad:** comentarios del equipo y cambios registrados, incluidos los del agente.
- **Acciones:** guardar, copiar para Slack, compartir por WhatsApp, archivar y eliminar.

## Semillas: captura rápida

Objetivo: un advisor frente a otra persona, en una conferencia, registra el contacto en menos de 15 segundos y sin escribir.

Canales de captura:

- **Voz:** audio de hasta 60 segundos. Se transcribe y la IA extrae nombre, cargo, organización, email, teléfono, interés, próximo paso, fecha y tronco sugerido. El advisor confirma con un toque y el audio queda guardado.
- **QR:**
  - vCard y MECARD se parsean localmente.
  - Una URL (por ejemplo, un perfil de LinkedIn) se guarda como link y la app pide una nota de voz corta.
  - Los QR de credenciales de eventos se intentan parsear y, si no se puede, se guarda el texto crudo.
- **Foto de tarjeta:** la IA con visión extrae los datos.
- **WhatsApp:** se envía un audio, una foto, un vCard o un texto al número de Wizor, y la semilla se crea sola. Es el canal principal para advisors.
- **Slack:** mensaje directo al bot o acción "Enviar a Pando" sobre un mensaje.
- **Atajo de Siri o Google Assistant:** hace una llamada autenticada al endpoint de captura. Es opcional y va en un sprint posterior.

Contexto automático de cada semilla: quién la capturó, fecha y hora, geolocalización aproximada (si se autoriza) y evento activo.

Después de la captura:

- **Seguimiento en 24 horas.** El agente redacta el mensaje de seguimiento y el advisor lo aprueba antes de enviarlo.
- **Métricas:**
  - semillas por evento,
  - tasa de conversión de semilla a hoja y de hoja a PoC,
  - aporte por advisor.

Privacidad: se guarda solo lo que la persona compartió, se registra el origen y se permite borrar por pedido (cumplimiento GDPR y leyes locales).

## Red de contactos ("Mi red")

Cada persona puede cargar sus contactos para que Pando encuentre **quién del equipo puede abrir cada puerta**, detecte patrones y sugiera reuniones, presentaciones y alianzas para cada oportunidad o proyecto.

### Fuentes de carga

- **Google Contacts:** conexión con un clic y solo lectura, con sincronización periódica.
- **LinkedIn:** el usuario descarga su propio archivo de conexiones desde la configuración de LinkedIn (exportación de datos, archivo `Connections.csv`) y lo sube. No se hace scraping ni se automatiza nada en LinkedIn.
- **Celular:** exportación de contactos en vCard (`.vcf`).
- **CSV o Excel:** con asistente de mapeo de columnas.
- **Automáticas:** contactos que ya pasan por Pando (semillas capturadas por la persona, participantes de reuniones asociadas a oportunidades).

Pando guarda solo lo necesario: nombre, organización, cargo, email, teléfono, URL de LinkedIn, ciudad y país, origen, y fecha de la última interacción conocida. No se importan notas personales, cumpleaños, direcciones ni fotos.

### Privacidad: cada red pertenece a su dueño

Los contactos son de quien los cargó. Nadie más ve su lista, ni siquiera el CEO. Cada persona elige, para toda su red o por contacto, uno de tres niveles:

| Nivel | Qué ve el resto del equipo | Uso por la IA |
|---|---|---|
| **Privado** (por defecto) | Nada | Solo le sugiere cosas a su dueño |
| **Conexión visible** | "Martín conoce a alguien en Petrobras (Gerencia de SSO)", sin nombre ni datos de contacto | Sugiere a todo el equipo pedirle una presentación a Martín |
| **Compartido** | Nombre, cargo y organización. Email y teléfono, nunca | Igual que el anterior, con más detalle |

**La presentación siempre la decide el dueño del contacto.** Cualquiera puede tocar "Pedir presentación" y el dueño recibe el pedido (en Pando y en Slack) con el contexto de la oportunidad. Puede aceptar, proponer otro camino o rechazar, sin tener que dar explicaciones.

**Si alguien deja Wizor**, sus contactos se eliminan de Pando, salvo los que ya estén vinculados a una oportunidad como contacto formal. Esta política se comunica al cargar la red por primera vez.

### Qué hace Pando con las redes

- **Caminos para abrir una puerta.** En la ficha de cada oportunidad aparece la sección "Quién puede ayudar", con los caminos ordenados por fortaleza:
  1. contacto directo en la organización;
  2. contacto con un cargo parecido al del decisor;
  3. contacto en una organización cercana (socio, proveedor, entidad del mismo gobierno o sector).
- **Viajes y eventos.** Cuando una persona marca un evento activo o tiene un viaje en la agenda, Pando sugiere contactos de la red del equipo en esa ciudad que sirven para oportunidades abiertas. Ejemplo: "En Houston, 3 contactos útiles para Lunar Mission Houston y NASA".
- **Alianzas.** Detecta organizaciones que aparecen en varias redes y en varias oportunidades, y propone alianzas. Ejemplo: "Un contacto de Honeywell trabaja con CODELCO y con Vale".
- **Patrones y huecos.** Muestra concentraciones de contactos sin oportunidades asociadas. Ejemplo: "El equipo tiene 18 contactos en minería de Chile y Perú y solo 1 oportunidad abierta". Pueden convertirse en semillas.
- **Fortaleza de la relación.** Se estima con la recencia y frecuencia de interacciones registradas en Pando (reuniones, semillas, comentarios). El dueño puede ajustarla con una etiqueta: conocido, buena relación o cercano.

En el árbol, una oportunidad con caminos de presentación disponibles muestra un pequeño ícono de "puerta abierta". El ícono sigue la regla de usabilidad: va acompañado de texto al pasar el cursor o al tocarlo, no se usa solo el color.

### Pantalla "Mi red"

- Botones de carga para cada fuente.
- Resumen de la red: cantidad de contactos, organizaciones, países y sectores.
- Nivel de privacidad general, con cambios por contacto.
- Pedidos de presentación recibidos y enviados.
- Opción para borrar toda la red o una fuente con un clic.

## Usabilidad (requisitos, prioridad sobre cualquier otra decisión)

La usabilidad manda sobre la estética, la marca y la sofisticación técnica. Si una funcionalidad complica el uso diario, se simplifica o se posterga.

1. **La metáfora es visual; los textos son simples.** El árbol, las hojas y las semillas viven en el dibujo y los íconos. La UI usa palabras comunes:

   | Concepto interno | Texto en la UI (es) | en | pt |
   |---|---|---|---|
   | Tronco | Línea de negocio | Business line | Linha de negócio |
   | Rama | Cuenta o programa | Account or program | Conta ou programa |
   | Hoja | Oportunidad | Opportunity | Oportunidade |
   | Semilla | Contacto nuevo | New contact | Novo contato |
   | Semillero | Contactos por revisar | Contacts to review | Contatos para revisar |
   | Paso | Paso / tarea | Step / task | Etapa / tarefa |
| Red de contactos | Mi red | My network | Minha rede |
| Camino de presentación | Quién puede ayudar | Who can help | Quem pode ajudar |

   Los términos "tronco", "hoja" y "semilla" pueden aparecer como apoyo (tooltips, ayuda, onboarding), nunca como único texto de un botón o título.

2. **Cada rol entra a su propia pantalla de inicio,** con el árbol siempre a un toque:
   - **CEO, cofounders y chiefs:** el árbol completo con los totales.
   - **PM:** el árbol, filtrado por defecto a las oportunidades con PoC o épica de Jira.
   - **Vendedores:** "Mis oportunidades", ordenadas por lo que vence primero.
   - **Colaboradores:** "Mis pasos", agrupados por hoy, esta semana y después.
   - **Advisors:** el botón grande "Nuevo contacto" y sus contactos recientes con su estado.
   - **Visitantes:** el resumen general.
3. **El árbol arranca plegado.** Se ven solo las líneas de negocio con cantidad y total, y se abren tocando. El buscador salta a la oportunidad, despliega su camino y la resalta. En el celular, el árbol se recorre por niveles (línea → cuenta → oportunidad) en lugar de mostrarse completo.
4. **Cada color tiene un solo significado.** Los verdes que maduran (y el dorado final) indican la etapa. El rojo significa vencido y el ámbar, vence en 7 días. Ningún otro elemento usa rojo o ámbar. El color nunca es la única señal: siempre va acompañado de texto o ícono.
5. **Regla de toques.** Marcar un paso, avanzar una etapa o comentar llevan como máximo dos toques. Capturar un contacto nuevo, uno solo.
6. **Pensado primero para el celular, completo en escritorio.** Los objetivos táctiles miden al menos 44 px y la navegación principal va abajo en el celular.
7. **Tres idiomas desde el día uno:** español (por defecto), inglés y portugués, con i18n desde el Sprint 0. El idioma se elige por usuario, con detección inicial del navegador. Fechas y montos se formatean según el idioma.
8. **Pruebas con usuarios reales en cada sprint.** Criterios medibles:
   - Un visitante describe el estado general del pipeline en 5 segundos.
   - Un advisor captura un contacto en 15 segundos o menos.
   - Un vendedor dice qué tiene que hacer hoy sin buscar.
   - Una persona nueva crea una oportunidad sin ayuda.

   Si un criterio no se cumple, se corrige antes de avanzar al sprint siguiente.
9. **Otras reglas:**
   - Se notifica por excepción, nunca por cada cambio.
   - La IA propone y el humano aprueba, salvo tareas explícitamente delegadas (ver agente en `04-integraciones.md`).
   - Los estados vacíos invitan a actuar. Los errores dicen qué pasó y cómo seguir.
   - Onboarding de 3 pantallas la primera vez, específico para cada rol.
   - Accesibilidad: foco visible, contraste AA y respeto por `prefers-reduced-motion`.
