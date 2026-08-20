# Registro de Tareas GTS

> Fuente operativa: qué se pidió, en qué estado está y cuándo se cerró.  
> Las capturas y chats generan entradas aquí; la ejecución vive en `task/task-*.md` y `docs/plans/`.

**Última actualización:** 2026-08-16

---

## Resumen rápido

| ID | Título | Estado | Prioridad | Módulo | Creada | Cierre | Rama |
|----|--------|--------|-----------|--------|--------|--------|------|
| TASK-001 | cerrar-registro-publico | en_progreso | alta | auth / landing | 2026-08-01 | — | — |
| TASK-002 | corregir-header-duplicado | en_progreso | media | shell / responsive | 2026-08-08 | — | — |
| TASK-003 | compactar-dashboard-semanal | en_progreso | media | dashboard / responsive | 2026-08-08 | — | — |
| TASK-004 | redisenar-sedes | finalizada | media | sedes | 2026-08-08 | 2026-08-09 | main |
| TASK-005 | mejorar-navegacion-calendario-dashboard | en_progreso | media | dashboard / calendario | 2026-08-08 | — | — |
| TASK-006 | actualizar-capturas-landing | en_progreso | media | landing | 2026-08-08 | — | — |
| TASK-007 | sesiones-bloques-ejecucion | en_progreso | media | sesiones | 2026-08-08 | — | — |
| TASK-008 | clonar-sede | finalizada | alta | sedes / datos | 2026-08-08 | 2026-08-09 | main |
| TASK-009 | corregir-listado-almacenamiento-documentos | en_progreso | alta | documentos / almacenamiento | 2026-08-16 | — | — |

**Leyenda estado:** `en_espera` · `en_progreso` · `finalizada`

---

## Detalle por tarea

### TASK-001 — cerrar-registro-publico

| Campo | Valor |
|-------|-------|
| Estado | en_progreso |
| Tipo | feature |
| Módulo | auth / landing |
| Prioridad | media |
| Creada | 2026-08-01 |
| Captura origen | `codex-clipboard-93de1cdb-191e-4cc6-ac2a-100181f91ac8.png` y `codex-clipboard-bc5c31a1-09e7-4629-a1bd-504661851380.png` |
| Evidencia | «¿No tienes cuenta? Crear cuenta» y pantalla pública «Crear cuenta» |
| Tarea maestra | `task/task-cerrar-registro-publico-01-08-2026.md` |
| Plan | `docs/plans/2026-08-01-cerrar-registro-publico.md` |
| Rama | — |
| Fecha cierre | 2026-08-01 |
| Commit / PR | — |

**Descripción:** Cerrar temporalmente todas las altas públicas de SportApp. Cualquier acceso o enlace de registro debe dirigir al formulario existente de lista de espera, mientras las cuentas existentes conservan el inicio de sesión por email/contraseña y Google.

**Notas:** Se amplía la tarea ya ejecutada de landing/waitlist; no es un duplicado porque corrige los accesos residuales de `/register` e invitaciones. Google se mantiene exclusivamente como login de cuentas existentes. El endpoint público de Auth confirma `disable_signup=true`, `email=true` y `google=true` tras guardar el cierre de altas en Supabase.

### TASK-002 — corregir-header-duplicado

| Campo | Valor |
|-------|-------|
| Estado | en_progreso |
| Tipo | bug |
| Módulo | shell / responsive |
| Prioridad | media |
| Creada | 2026-08-08 |
| Captura origen | `codex-clipboard-25e51c86-9db6-44a7-9508-f849034a4016.png` y `codex-clipboard-b5748b1b-6dc4-4f9f-9508-fd7c21677dfe.png` |
| Evidencia | «has puesto varias veces el header repitiendo informacion»; en `/documentos` y `/jugadores` aparecen simultáneamente el TopBar y la cabecera destinada a móvil |
| Tarea maestra | `task/task-corregir-header-duplicado-08-08-2026.md` |
| Plan | `docs/plans/2026-08-08-corregir-header-duplicado.md` |
| Rama | — |
| Fecha cierre | — |
| Commit / PR | — |

**Descripción:** Conservar en escritorio únicamente la barra superior completa con notificaciones y avatar, ocultar la cabecera móvil a partir del breakpoint `md` y mantener intactos sidebar, contenido, rutas, permisos y navegación móvil.

**Notas de ejecución:** Corrección aplicada con `md:hidden` en la cabecera móvil. Lint, TypeScript, build y 229/229 unitarios en verde. La inspección autenticada queda pendiente de una sesión E2E local; el estado permanece `en_progreso` hasta confirmación humana.

### TASK-003 — compactar-dashboard-semanal

| Campo | Valor |
|-------|-------|
| Estado | en_progreso |
| Tipo | refactor |
| Módulo | dashboard / responsive |
| Prioridad | media |
| Creada | 2026-08-08 |
| Captura origen | `codex-clipboard-8793034a-b9f4-4b0b-8cd5-fd794c16aa3c.png` y `codex-clipboard-5267f189-8f33-4608-8b9a-1e8fffd58220.png` |
| Evidencia | «los cuadros ocupan mucho espacio», «quiero ver los siete días de la semana en un renglón tanto en web como en móvil», «elimina la sesión de sesiones y fecha que hay debajo del título», «Panel de rendimiento es demasiado grande» y «quita ese texto» sobre el subtítulo descriptivo |
| Tarea maestra | `task/task-compactar-dashboard-semanal-08-08-2026.md` |
| Plan | `docs/plans/2026-08-08-compactar-dashboard-semanal.md` |
| Rama | — |
| Fecha cierre | — |
| Commit / PR | — |

**Descripción:** Reducir la densidad vertical del dashboard, normalizar su encabezado con `PageHeader` sin subtítulo descriptivo, eliminar la franja redundante de tres resúmenes y presentar los siete días de la semana en una única fila visible en escritorio y móvil, sin cambiar filtros, sesiones, navegación semanal ni acciones.

**Notas de ejecución:** Implementación verificada: `PageHeader` estándar sin subtítulo, franja redundante retirada y semana compacta en siete columnas. Lint, TypeScript, build y 232/232 tests en verde; detector de layout sin hallazgos. Inspección autenticada pendiente por falta de sesión E2E. Se mantiene `en_progreso` hasta validación visual humana.

### TASK-004 — redisenar-sedes

| Campo | Valor |
|-------|-------|
| Estado | finalizada |
| Tipo | feature |
| Módulo | sedes |
| Prioridad | media |
| Creada | 2026-08-08 |
| Captura origen | `C:\Users\juans\AppData\Local\Temp\codex-clipboard-27ce6574-7a95-4197-a0a5-aba03ee1357e.png`, `codex-clipboard-883526ca-2532-46ba-a72e-a1653900456f.png` y `codex-clipboard-cec7a90f-4715-4a83-8431-22b547d56f39.png` |
| Evidencia | Petición «mejorar visualmente Sedes» y ampliación aprobada de scroll interno encadenado con la página para equipos, sesiones y miembros, con jerarquía reforzada en la cabecera de sede |
| Tarea maestra | `task/task-redisenar-sedes-08-08-2026.md` |
| Plan | `docs/plans/2026-08-08-redisenar-sedes.md` |
| Rama | main |
| Fecha cierre | 2026-08-09 |
| Commit / PR | — |

**Descripción:** Reforzar la jerarquía visual y accesible de la vista Sedes, diferenciar equipos, sesiones, miembros, roles y estados con la identidad Banquillo editorial, añadir scroll interno a las listas de equipos, sesiones y miembros que continúe en la página al alcanzar sus límites, y asegurar controles visibles en escritorio y táctil, responsive y dark mode, sin cambiar comportamiento, datos, permisos ni CRUD.

**Notas:** No requiere migración. El seguimiento corrigió el scroll atrapado sustituyendo `overscroll-contain` por encadenamiento vertical nativo en equipos, sesiones y miembros. Verifier `standard` PASA: Sedes 3/3 archivos y 17/17; `cloneSede` 2/2 y 35/35; runner+reducer 2/2 y 15/15; lint y TypeScript PASS; suite 59/59 archivos y 386/386; build PASS tras reintento por red de Google Fonts; detector Impeccable único `[]`. La validación autenticada real desktop/móvil cubrió login, `/sedes`, dos sedes, clic/Space/Enter, segunda sede, primer equipo, `Editar`, ARIA, sin errores ni overflow horizontal. Limitación no bloqueante: dataset corto (equipos 153/153 desktop, 226/226 móvil; sesiones 28/28) sin overflow ni delta de `scrollTop`; el fallback E2E no se relanzó. Cierre confirmado humanamente el 09/08/2026 en `main`, con GIT off y sin afirmar merge.

### TASK-006 — actualizar-capturas-landing

| Campo | Valor |
|-------|-------|
| Estado | en_progreso |
| Tipo | refactor |
| Módulo | landing |
| Prioridad | media |
| Creada | 2026-08-08 |
| Captura origen | `codex-clipboard-ceee6148-9c6b-42a6-ab8e-3a4c7d7c71a8.png` |
| Evidencia | «se ha cambiado el diseño totalmente de la aplicación y las fotos que salen en la landing son del diseño anterior»; el usuario marca expresamente la insignia `DEV` y pide que no aparezca |
| Tarea maestra | `task/task-actualizar-capturas-landing-08-08-2026.md` |
| Plan | `docs/plans/2026-08-08-actualizar-capturas-landing.md` |
| Rama | — |
| Fecha cierre | — |
| Commit / PR | — |

**Descripción:** Renovar las capturas reales de producto que se muestran en la landing con el rediseño actual. Las imágenes se obtienen desde un build de producción para garantizar que la insignia de entorno `DEV` no se renderiza; no se cambian fotografías, ilustraciones, copy ni estructura comercial.

**Notas:** B15-1 documentó la renovación de la landing del 01/08/2026, pero no cubre el rediseño posterior de la aplicación autenticada, por lo que esta petición no es un duplicado. `/auto` confirma planificación y ejecución sin pausa. No requiere migración ni cambios remotos. Implementación verificada: cinco PNG 1600×1000 capturados desde `next start`, build Next.js 16.2.1 verde y landing validada a 1440×900 y 375×667 sin imágenes rotas, overflow ni `DEV`. El dashboard se dejó en estado vacío para no publicar sesiones históricas reales. Una captura posterior demostró que `next/image` aún servía la variante cacheada de `/landing/01-dashboard.png`; se corrigió versionando los cinco nombres como `*-redesign-2026.png`, con regresión 2/2, build y render de producción verdes. Se mantiene `en_progreso` hasta confirmación humana de cierre.

### TASK-005 — mejorar-navegacion-calendario-dashboard

| Campo | Valor |
|-------|-------|
| Estado | en_progreso |
| Tipo | feature |
| Módulo | dashboard / calendario |
| Prioridad | media |
| Creada | 2026-08-08 |
| Captura origen | `codex-clipboard-574df6ba-f154-42a6-b5e6-c050aa56fe83.png`, `codex-clipboard-8f9bc4d0-1352-460a-ad43-45d0de709eee.png` y `codex-clipboard-3aff2d0b-a62d-4a69-a07a-540dd8b993e8.png` |
| Evidencia | «cuando marque ese botón que se vea el mes y se pincha otra vez que solo se vea la semana», «cuando pinche aquí que salga el típico calendario para navegar por meses y años», «necesito saber el número de sesiones que hay en cada día [...] con algún chip dentro [...] haz el calendario más chico [...] y con cuadrícula» y «solo se ve en la semana pero se ve un número debajo que lleva a no saber qué hay [...] en la vista de mes no se ve» |
| Tarea maestra | `task/task-mejorar-navegacion-calendario-dashboard-08-08-2026.md` |
| Plan | `docs/plans/2026-08-08-mejorar-navegacion-calendario-dashboard.md` |
| Rama | — |
| Fecha cierre | — |
| Commit / PR | — |

**Descripción:** Convertir los controles de fecha del dashboard en una navegación de dos niveles: el icono de calendario alterna entre la banda semanal y el mes completo, mientras que el rango semanal abre un selector emergente con controles de mes y año para saltar rápidamente a cualquier fecha admitida. Tanto la semana como el mes deben mostrar dentro de cada día con actividad un chip inequívoco con el número de sesiones filtradas; el mes será además compacto y tendrá una cuadrícula clara. La fecha elegida actualiza la semana y las sesiones visibles sin cambiar filtros, datos ni contenido.

**Notas de ejecución (08/08/2026):** No duplica TASK-003: aquella tarea compactó la presentación semanal; TASK-005 añade comportamiento de navegación. Se reutilizaron `Calendar`, `Popover` y `react-day-picker` ya presentes, sin dependencias ni migraciones nuevas. Verificación técnica: 2 archivos de tests dirigidos, 7/7 tests PASS; lint PASS; typecheck PASS; suite completa `npm.cmd test -- --run` con 44 archivos y 259 tests PASS en 16.60 s; build de Next.js 16.2.1 PASS con 25 rutas. Verifier independiente STANDARD: PASA, sin incidencias. La validación visual/E2E no se ejecutó: `/dashboard` redirige a `/login`, no existe `.env.test.local` ni una sesión autenticada reutilizable; no se inventaron credenciales ni se condujo OAuth. TASK-005 permanece `en_progreso` hasta validación humana.

**Ampliación confirmada (08/08/2026):** El usuario aprueba incorporar al mismo calendario chips de conteo coherentes en semana y mes, una cuadrícula mensual legible y una composición más compacta. El número semanal actual no es suficiente porque parece texto suelto y no identifica qué cuenta. La evidencia técnica anterior corresponde al alcance inicial; esta ampliación queda pendiente de ejecución y de una nueva verificación STANDARD.

**Notas de ampliación (08/08/2026):** Implementados chips coherentes en semana y mes, nombres accesibles con singular/plural, cuadrícula mensual de celdas táctiles de 44 px y conteos derivados de todas las sesiones filtradas. Verificación STANDARD: 10/10 tests dirigidos, suite completa 44 archivos/262 tests, lint, typecheck y build Next.js 16.2.1 (25 rutas) en verde; detector Impeccable sin hallazgos. La inspección autenticada no fue viable porque `/dashboard` redirige a `/login`. TASK-005 permanece `en_progreso` hasta validación visual humana.

---

### TASK-007 — sesiones-bloques-ejecucion

| Campo | Valor |
|-------|-------|
| Estado | en_progreso |
| Tipo | feature |
| Módulo | sesiones |
| Prioridad | media |
| Creada | 2026-08-08 |
| Captura origen | `codex-clipboard-8c22b74b-0513-45d1-9692-534240a51ec6.png` y `codex-clipboard-e3f958e7-022e-407e-81b3-c9084d62b52c.png` |
| Evidencia | La lista de Sesiones solo muestra `Editar`/`Eliminar` y el modal usa una selección plana de `Ejercicios`; se solicita `Ejecutar` y una composición 1:N de bloques ordenados con cronómetro y recurso opcional. |
| Tarea maestra | `task/task-sesiones-bloques-ejecucion-08-08-2026.md` |
| Plan | `docs/plans/2026-08-08-sesiones-bloques-ejecucion.md` |
| Rama | — |
| Fecha cierre | — |
| Commit / PR | — |

**Descripción:** Convertir cada sesión en una secuencia ordenada de bloques editables y ejecutables. Cada bloque tendrá título, duración, ejercicio obligatorio y como máximo un Documento opcional; el ejecutor conservará localmente el cronómetro y separará el bloque cronometrado del bloque previsualizado.

**Notas:** Las dos capturas se confirmaron como una sola feature. Absorbe y actualiza el alcance B2 del backlog sin duplicarlo. La migración de `development` fue autorizada explícitamente el 08/08/2026; producción queda fuera y será manual. Verificación full completada el 09/08/2026: lint y TypeScript PASS; 51 pruebas dirigidas y 546 de Vitest completas PASS; build PASS; E2E gestionado Chromium 8/8 y Mobile Chrome 8/8, sin skips; fixture e invariantes de BD PASS. Los roles de fixture fueron `admin`, `entrenador`, `gerente_sede` y `jugador`, sin registrar credenciales ni identificadores. TASK-007 permanece `en_progreso` hasta confirmación humana; GIT=off, rama y fecha de cierre siguen en `—`.

---

### TASK-008 — clonar-sede

| Campo | Valor |
|-------|-------|
| Estado | finalizada |
| Tipo | feature |
| Módulo | sedes / datos |
| Prioridad | alta |
| Creada | 2026-08-08 |
| Captura origen | `C:\Users\juans\AppData\Local\Temp\codex-clipboard-8e286572-baa3-48f5-877e-1dad5118460f.png`; seguimientos `codex-clipboard-710bd492-5a4d-4724-baf8-b33f117c5fe3.png` y `codex-clipboard-b9dd8894-ff8d-4ad4-9e89-c679ef931648.png` |
| Evidencia | El último seguimiento muestra el error «Cannot read properties of undefined (reading 'rest')» y solicita confirmar antes de continuar cuando relaciones o sesiones deban omitirse por no clonar su equipo padre. |
| Tarea maestra | `task/task-clonar-sede-08-08-2026.md` |
| Plan | `docs/plans/2026-08-08-clonar-sede.md`; seguimientos `docs/plans/2026-08-09-corregir-selector-scroll-clonar-sede.md` y `docs/plans/2026-08-09-confirmar-omisiones-clonar-sede.md` |
| Rama | main |
| Fecha cierre | 2026-08-09 |
| Commit / PR | — |

**Descripción:** Ampliar la creación de sedes con un modo opcional de clonación selectiva. La sede destino siempre será un registro nuevo con el nombre y la dirección introducidos; el usuario podrá elegir una sede origen y copiar equipos, vínculos de entrenadores y jugadores, sesiones con su estructura de ejercicios, parámetros y asociaciones a documentos existentes, sin duplicar personas, documentos, ejercicios, adjuntos, feedback ni configuración de la sede.

**Notas:** Las RPC `20260808190000_clonar_sede.sql` y `20260809130000_clone_sede_omissions.sql` están aplicadas, reconciliadas y alineadas `local=remote` en development. Seguridad postflight: `SECURITY DEFINER`, `search_path=public, pg_temp`, execute solo para `authenticated`. Verifier FULL acotado: 77/77 dirigidos, suite 556/556, lint, TypeScript y build PASS; E2E autenticado Chromium 8/8 y Mobile Chrome 8/8. La autorización posterior para `db push` no se utilizó; los pendientes 170000/180000 son ajenos e independientes, no se aplicaron y mantienen gates propios. GIT=off.

---

### TASK-009 — corregir-listado-almacenamiento-documentos

| Campo | Valor |
|-------|-------|
| Estado | en_progreso |
| Tipo | bug |
| Módulo | documentos / almacenamiento |
| Prioridad | alta |
| Creada | 2026-08-16 |
| Captura origen | `codex-clipboard-6e60aa51-2fa0-471d-bc3b-8abd184ae2c6.png` |
| Evidencia | Tras completar `reserve_document_upload` y `complete_document_upload`, `/documentos?fuente=supabase_storage` muestra `Almacenamiento (0)` y solo el tutorial; la captura registra decenas de lecturas repetidas de `documento_sedes`, `documentos` y pivotes. |
| Tarea maestra | `task/task-corregir-listado-almacenamiento-documentos-16-08-2026.md` |
| Plan | `docs/plans/2026-08-16-corregir-listado-almacenamiento-documentos.md` |
| Rama | — |
| Fecha cierre | — |
| Commit / PR | — |

**Descripción:** Mostrar los archivos ya subidos como una lista operable con acciones para abrir, editar sus atributos en modal, eliminar y subir otro archivo. Corregir la incoherencia que oculta documentos globales al filtrar por la sede activa, preseleccionar esa sede en nuevas altas y resolver una sola vez el alcance documental compartido por los catálogos de proveedor.

**Notas:** El usuario solicitó expresamente ejecutar la corrección, por lo que el intake pasa directamente a `en_progreso`. No requirió migración; `20260808180000` se confirmó `local=remote`. Implementación: lista unificada con una sola consulta paginada en servidor, globales + sede activa visibles, sede preseleccionada al crear y scope de assets compartido; selector de tres métodos y tarjeta de cuota Storage conservados. Carga/error editorial y de catálogo no se confunden con vacío, y la página se reinicia al cambiar workspace/sede. La edición mantiene como solo lectura la URL de enlaces gestionados y permite cambiar sus metadatos/asociaciones. Verificación: lint, TypeScript, 65/65 pruebas dirigidas y build PASS; inspección autenticada desktop/móvil sin fixtures remotas. La suite global mantiene 11 fallos ajenos de `global-request-lock`. Se conserva `en_progreso` hasta confirmación humana de cierre.

---

## Histórico de cambios de estado

| Fecha | ID | De → A | Motivo |
|-------|-----|--------|--------|
| 2026-08-01 | TASK-001 | — → en_espera | Alta desde capturas de login y registro |
| 2026-08-01 | TASK-001 | en_espera → en_progreso | El usuario confirma que no debe poder crearse ninguna cuenta por ahora |
| 2026-08-08 | TASK-002 | — → en_espera | Alta desde captura del header duplicado; alcance confirmado por el usuario |
| 2026-08-08 | TASK-002 | en_espera → en_progreso | El usuario confirma que el defecto persiste y autoriza ejecutar la corrección |
| 2026-08-08 | TASK-003 | — → en_espera | Alta desde captura del dashboard; alcance confirmado y plan solicitado por el usuario |
| 2026-08-08 | TASK-003 | en_espera → en_progreso | El usuario aprueba ejecutar el plan de compactación responsive |
| 2026-08-08 | TASK-004 | — → en_espera | Alta desde captura de Sedes; deduplicación sin coincidencias específicas |
| 2026-08-08 | TASK-004 | en_espera → en_progreso | El usuario confirma el alcance visual y `/auto` continúa sin pausa |
| 2026-08-08 | TASK-004 | en_progreso → en_progreso | Perfil standard verificado en verde; inspección visual autenticada limitada por redirección a `/login`, pendiente de confirmación humana |
| 2026-08-08 | TASK-004 | en_progreso → en_progreso | Ampliación de scroll interno y jerarquía de cabecera implementada; verificación propia verde, pero verifier global bloqueado por TASK-008 y sin evidencia visual válida |
| 2026-08-08 | TASK-004 | en_progreso → en_progreso | Scroll interno corregido para encadenarse con la página al alcanzar sus límites; 16/16 pruebas dirigidas, lint y build en verde; suite global y validación visual siguen bloqueadas por trabajo concurrente y servidor sin hidratar |
| 2026-08-09 | TASK-004 | en_progreso → finalizada | Verifier `standard` PASA y confirmación humana de cierre; evidencia técnica y visual autenticada registrada, con la limitación no bloqueante de dataset corto |
| 2026-08-08 | TASK-005 | — → en_espera | Alta desde capturas del dashboard; alcance de alternancia semana/mes y selector de fecha confirmado |
| 2026-08-08 | TASK-005 | en_espera → en_progreso | Inicio de ejecución aprobada |
| 2026-08-08 | TASK-005 | en_progreso → en_progreso | Verificación técnica STANDARD superada (tests dirigidos 7/7, lint, typecheck, suite 259/259 y build); validación visual/E2E pendiente por redirección a `/login` sin `.env.test.local` ni sesión autenticada reutilizable |
| 2026-08-08 | TASK-006 | — → en_espera | Alta desde captura de la UI actual y petición de renovar las imágenes de producto de la landing |
| 2026-08-08 | TASK-006 | en_espera → en_progreso | El usuario solicita `/auto` y confirma que las capturas deben reflejar el diseño actual sin la insignia `DEV` |
| 2026-08-08 | TASK-007 | — → en_espera | Alta unificada desde las dos capturas de Sesiones; alcance confirmado y plan solicitado por el usuario |
| 2026-08-08 | TASK-007 | en_espera → en_progreso | Inicio de ejecución aprobada |
| 2026-08-08 | TASK-008 | — → en_progreso | `/auto` confirmó el intake y el inicio de planificación; la migración sigue su gate independiente y pendiente |
| 2026-08-09 | TASK-008 | en_progreso → finalizada | Confirmación humana y verifier FULL acotado PASS: 77/77 dirigidos, 556/556 suite, lint, TypeScript, build y E2E Chromium/Mobile 8/8; migraciones propias alineadas, drift ajeno no aplicado |
| 2026-08-16 | TASK-009 | — → en_progreso | La captura y la orden «corrígelo» confirman el bug y autorizan planificación y ejecución sin migración. |
