# Tarea Maestra — Clonar sede

**ID:** TASK-008  
**Estado:** finalizada  
**Tipo:** feature  
**Prioridad:** alta  
**Módulo:** sedes / datos  
**Creada:** 08/08/2026  
**GIT:** off

## Contexto

La captura `C:\Users\juans\AppData\Local\Temp\codex-clipboard-8e286572-baa3-48f5-877e-1dad5118460f.png` muestra el modal actual «Nueva sede», limitado a los campos «Nombre» y «Dirección» y a las acciones «Cancelar» y «Guardar cambios». Se quiere conservar esa alta simple y añadir un modo opcional para crear una sede nueva copiando contenido elegido de otra sede del mismo workspace.

El CRUD actual crea `sedes` con `configuracion_visual = {}` y `responsable_id = null`. `SedeForm` gestiona el formulario, `SedesListView` decide entre alta y edición, `useSedes` coordina las mutaciones y `createSede` solo inserta una sede. No existe clonación previa.

## Alcance confirmado

- La sede destino siempre es un registro nuevo y usa el nombre y la dirección introducidos en el formulario.
- No se clonan `responsable_id` ni `configuracion_visual`; se mantienen los defaults actuales `null` y `{}`.
- El modo de clonación es opcional. Desactivado, el alta simple continúa por `createSede` sin cambios de comportamiento.
- El origen debe ser una sede existente del mismo workspace activo.
- La selección admite categorías, elementos individuales y seleccionar todo. El triestado se conserva en cada categoría; el control global es binario y solo se marca cuando todo está seleccionado.
- El cuerpo del modal de alta debe desplazarse verticalmente para alcanzar todas las categorías en escritorio y móvil, manteniendo cabecera y acciones utilizables.
- La operación completa se ejecuta en una única transacción PostgreSQL mediante una RPC nueva.

## Reglas de negocio

### Contenido incluido

- **Equipos:** crear filas nuevas en la sede destino, preservando `nombre`, `categoria` y `workspace_id`. Los IDs cambian y se devuelve el mapa origen → destino.
- **Entrenadores y jugadores:** nunca duplicar personas. Crear vínculos idempotentes en `entrenador_sedes` y `jugador_sedes` hacia la sede nueva.
- **Relaciones de equipos:** al clonar un equipo, copiar sus filas de `entrenador_equipos` y `jugador_equipos` contra el ID del equipo nuevo, preservando `rol`, `dorsal` y `posicion`. También garantizar el vínculo de esas personas con la sede destino.
- **Sesiones:** si su equipo origen está seleccionado, crear la sesión contra el ID del equipo nuevo y preservar sus campos válidos. Si el equipo no se clona, omitir la sesión y todas sus relaciones, avisándolo antes de continuar y en el resumen final.
- **Entrenadores de sesión:** copiar `sesion_entrenadores` contra el ID de sesión nuevo, reutilizando los IDs de entrenadores existentes y garantizando su vínculo con la sede destino.
- **Estructura de ejercicios:** copiar las filas de `sesion_detalle` con el nuevo `sesion_id`, preservando orden, tiempos, variante y la referencia al ejercicio existente. No duplicar ejercicios.
- **Parámetros:** crear nuevas filas hijas de la sede destino con `categoria`, `nombre`, `activo` y `workspace_id` del origen.
- **Documentos:** no duplicar binario ni metadatos. Crear únicamente nuevas asociaciones `documento_sedes` hacia documentos existentes del workspace.

### Contenido excluido

- `sedes.responsable_id` y `sedes.configuracion_visual`.
- Personas de `entrenadores` y `jugadores`.
- Ejercicios de la biblioteca.
- `sesiones.feedback_post_entreno`.
- `sesion_documentos`, `documento_equipos` y cualquier otro adjunto.
- El binario y los metadatos de `documentos`.
- `usuarios.sede_id` legacy.

### Seguridad e invariantes

- La RPC recibe `workspace_id`, `source_sede_id`, nombre/dirección y una selección JSONB con arrays de UUID únicos.
- Debe comprobar `auth.uid()`, membresía y rol gestor del workspace (`superadmin`, `admin` o `gerente_sede`).
- Debe validar que la sede origen y todos los IDs seleccionados pertenecen al mismo workspace y, cuando corresponde, a la sede/equipo origen.
- Debe rechazar claves desconocidas, IDs repetidos, sesiones sin su equipo seleccionado y referencias a ejercicios ajenos al workspace.
- Usa `SECURITY DEFINER` con `search_path` fijado, revoca acceso de `PUBLIC`/`anon` y concede `EXECUTE` solo a `authenticated`.
- Cualquier error revierte sede y descendientes; no se admite éxito parcial.

## Checklist de implementación

- [x] Preparar `supabase/migrations/20260808190000_clonar_sede.sql` sin aplicarla.
- [x] Pasar el gate y registrar una autorización inequívoca de development en el plan.
- [x] Aplicar únicamente mediante Supabase Management API y reconciliar el historial; nunca usar `supabase db push`.
- [x] Definir tipos y schema Zod para selección, opciones y resultado.
- [x] Añadir lectura tenant-scoped del contenido clonable y la mutación `cloneSede`.
- [x] Exponer query/mutation e invalidaciones en `useSedes` y `queryKeys`.
- [x] Crear `SedeCloneContentSelector` accesible, responsive y con estados de carga/error/vacío.
- [x] Integrar el modo opcional en `SedeForm` y `SedesListView` sin alterar alta simple ni edición.
- [x] Cubrir schema, servicio, UI, seguridad, atomicidad y remapeos con TDD vertical.
- [x] Verificar desktop y móvil con BD development y cruzar UI ↔ RPC ↔ filas persistidas.
- [x] Actualizar backlog, auditoría CRUD si corresponde y trazabilidad de TASK-008 tras la verificación.

## Criterios de aceptación

- [x] El usuario puede crear una sede vacía exactamente como antes.
- [x] Al activar «Clonar contenido de otra sede», puede elegir un origen del workspace y seleccionar todo, una categoría o elementos individuales; una selección parcial global se muestra desmarcada y solo las categorías conservan estado mixto.
- [x] El modal permite desplazarse hasta la última categoría y sus acciones en escritorio y móvil sin overflow horizontal.
- [x] Un entrenador o jugador seleccionado se asocia a la sede aunque su equipo no se clone; no se crea una pivote de equipo sin equipo destino.
- [x] Una sesión seleccionada sin su equipo se omite junto a sus dependencias; antes de mutar, un diálogo enumera omisiones y permite «Continuar de todos modos» o «Cancelar y revisar».
- [x] El resultado muestra un resumen autoritativo de relaciones y elementos omitidos, sin mensajes técnicos como `.rest`.
- [x] La sede y todas las copias se crean atómicamente; un ID ajeno o un error intermedio no deja filas parciales.
- [x] Equipos y sesiones tienen IDs nuevos y todas sus pivotes apuntan a los IDs remapeados.
- [x] Personas, documentos y ejercicios conservan sus IDs y no aumentan sus tablas base.
- [x] `feedback_post_entreno`, adjuntos, responsable y configuración no se clonan.
- [x] La RPC deniega anónimo, rol no gestor, otro workspace y payload manipulado.
- [x] Tras éxito se actualizan las vistas/cachés relacionadas y se muestra un resumen comprensible en español.
- [x] El flujo funciona en Chromium escritorio y Mobile Chrome, y la evidencia BD coincide con la UI.

## Archivos previstos

- `supabase/migrations/20260808190000_clonar_sede.sql`
- `src/types/database.types.ts`
- `src/types/sedes.ts`
- `src/schemas/sede.schema.ts`
- `src/services/sedes.service.ts`
- `src/hooks/queryKeys.ts`
- `src/hooks/useSedes.ts`
- `src/components/sedes/SedeCloneContentSelector.tsx`
- `src/components/sedes/SedeForm.tsx`
- `src/components/sedes/SedesListView.tsx`
- `src/__tests__/schemas/sede.test.ts`
- `src/__tests__/services/sedes.service.test.ts`
- `src/__tests__/services/tenant-scope.test.ts`
- `src/__tests__/components/SedeCloneContentSelector.test.tsx`
- `src/__tests__/components/SedeForm.test.tsx`
- `src/__tests__/components/SedesListView.test.tsx`
- `e2e/sede-clone.spec.ts`
- `docs/crud-audit.md` (solo si la verificación confirma el nuevo flujo)
- `docs/backlog.md`
- `task/REGISTRO-TAREAS.md`
- `task/task-clonar-sede-08-08-2026.md`
- `docs/plans/2026-08-08-clonar-sede.md`

## Plan de ejecución

- Registro: TASK-008 en `task/REGISTRO-TAREAS.md`.
- Backlog: B5-6 en `docs/backlog.md`.
- Plan técnico: `docs/plans/2026-08-08-clonar-sede.md`.
- Seguimiento visual: `docs/plans/2026-08-09-corregir-selector-scroll-clonar-sede.md`.
- Seguimiento de relaciones y confirmación: `docs/plans/2026-08-09-confirmar-omisiones-clonar-sede.md`.
- Estado de migración: `20260809130000_clone_sede_omissions.sql` aplicada y reconciliada en development. El seguimiento añade omisiones controladas sin cambiar la firma pública de la RPC.

> **ESTADO:** FINALIZADA el 09/08/2026 en la rama `main`, tras confirmación humana y verifier FULL acotado en verde. GIT=off: no se creó commit, PR ni push.

## Seguimiento visual — 09/08/2026

- Implementado: «Seleccionar todo» ya es binario; las selecciones parciales se muestran desmarcadas y el triestado se conserva por categoría.
- Implementado: el formulario completa la cadena flex y permite que `DialogBody` sea el área de scroll, manteniendo cabecera y pie fuera.
- Evidencia propia: 14/14 tests dirigidos, lint dirigido y build Next.js 16 verdes.
- Bloqueo histórico resuelto: el fallo ajeno de `serverEnv.test.ts` y la selección legacy de sede del bootstrap E2E quedaron corregidos antes del cierre FULL.
## Cierre — 09/08/2026

- Verifier FULL acotado a TASK-008: 77/77 pruebas dirigidas, 556/556 en la suite completa, lint, TypeScript y build PASS.
- E2E autenticado: Chromium 8/8 y Mobile Chrome 8/8, incluyendo clonación completa/parcial, resumen y remapeos, aislamiento tenant, dependencias de sesión, permisos y scroll real.
- Las migraciones propias `20260808190000_clonar_sede.sql` y `20260809130000_clone_sede_omissions.sql` están alineadas `local=remote` en development `rgmrqkoudyotkpqgezzv`.
- La autorización posterior para `db push` no se utilizó: el flujo propio ya estaba aplicado y reconciliado. Las migraciones pendientes `20260809170000_schedule_document_asset_reconciliation.sql` y `20260809180000_economic_movement_invariants.sql` son ajenas e independientes; no se aplicaron y requieren sus propios gates según la guía de datos.
- Fixtures, contexto de autenticación y servidores temporales quedaron limpiados. Detector Impeccable: `[]`.
