# Tarea Maestra — Sesiones por bloques y modo Ejecutar

**Estado:** en_progreso  
**Creada:** 2026-08-08  
**Prioridad:** media  
**Tipo:** feature  
**Módulo:** sesiones

## Contexto

La lista de `/sesiones` ofrece hoy `Editar` y `Eliminar`. El formulario guarda una selección plana y ordenada de ejercicios en `sesion_detalle`, con tiempos opcionales, pero no representa bloques con identidad, título ni recurso propio. La feature unifica las dos capturas aportadas: añade `Ejecutar`, sustituye el editor plano por una composición 1:N de bloques y ofrece un cronómetro persistente por sesión.

El repositorio ya dispone de `documentos` para archivos de Supabase Storage y enlaces externos —incluidos YouTube y Google Drive—, por lo que un bloque referencia como máximo un Documento existente. Los roles canónicos son `superadmin`, `admin`, `gerente_sede`, `entrenador` y `jugador`; solo los cuatro primeros pueden consultar, definir y ejecutar sesiones.

## Alcance y reglas

- Una sesión contiene uno o más bloques ordenados y permite repetir el mismo ejercicio en bloques distintos.
- Cada bloque exige título no vacío, duración entera positiva en minutos y ejercicio; `documentoId` es opcional y singular.
- El Documento puede ser un archivo o un enlace externo. No se añaden columnas específicas para YouTube o Google Drive ni se persisten URLs duplicadas en el bloque.
- Añadir, editar, eliminar y reordenar bloques recalcula `sesiones.duracion_estimada` como la suma exacta de sus duraciones. El valor deja de ser una entrada manual.
- Las nuevas definiciones viven en `sesion_bloques`; `sesion_detalle` permanece intacta y no recibe doble escritura.
- Una sesión sin bloques nuevos puede importar `sesion_detalle` como borrador: título desde el ejercicio, duración desde `tiempo_ejecucion`, orden conservado y recurso vacío. Si falta duración, se exige completarla antes de guardar o ejecutar.
- El modo `Ejecutar` distingue `activeBlockId` —bloque cronometrado o preparado— de `viewedBlockId` —bloque cuyo ejercicio/recurso se consulta—.
- Cambiar la previsualización nunca pausa, reinicia ni sustituye el cronómetro activo. Solo `Play` sobre otro bloque congela el anterior y arranca o reanuda el elegido.
- Nunca hay dos cronómetros activos ni inicio automático. `Pausa` congela el restante; `Saltar bloque` consume el activo y prepara el siguiente parado.
- Al llegar a cero se guarda el bloque como agotado y se prepara el siguiente sin arrancarlo. Si el usuario estaba viendo el bloque agotado, la previsualización avanza; si estaba consultando otro, no se le cambia la vista.
- Al agotar el último bloque la ejecución queda completada y parada. Reproducir de nuevo un bloque agotado lo reinicia con su duración completa.
- El estado de ejecución se persiste solo en `localStorage`, sin historial en Supabase. La clave queda versionada y aislada por usuario, workspace y sesión; solo contiene IDs, tiempos y estado, nunca documentos ni URLs.
- Recargar, reiniciar el navegador o cerrar y volver a abrir la aplicación descuenta el tiempo real transcurrido de un bloque que estaba en marcha.
- Un cambio de versión o de la firma `id/orden/duracion` de los bloques invalida el estado local completo y muestra aviso; no se mezcla progreso con una definición editada.
- Un reloj del dispositivo atrasado nunca añade tiempo: se pausa/reconcilia de forma segura y se informa. Un salto hacia delante puede agotar el bloque, pero nunca autoarranca el siguiente.
- Varias pestañas comparten el estado mediante `storage` y una revisión monotónica; la última acción explícita válida gana y todas convergen a un único `activeBlockId`.
- La reordenación tendrá botones accesibles Subir/Bajar; no se añade una dependencia drag-and-drop. Los recursos se pueden abrir antes de Play y nunca reproducen vídeo automáticamente.
- La ruta canónica será `/sesiones/[sesionId]/ejecutar`; en Next.js 16 la página esperará `params` antes de entregar el ID a la vista cliente.
- La migración está autorizada exclusivamente para `development`. Producción queda como operación manual fuera de esta tarea.

## Criterios de aceptación

- [ ] La tabla de Sesiones muestra `Ejecutar` junto a `Editar` y `Eliminar` para los roles autorizados.
- [ ] `admin`, `gerente_sede` y `entrenador` pueden crear y editar bloques; `superadmin` conserva el acceso y `jugador`/anónimo quedan denegados por UI y RLS.
- [ ] El formulario permite añadir, modificar, eliminar y reordenar tantos bloques como se necesiten, con validación accesible en español.
- [ ] El mismo ejercicio puede aparecer más de una vez y cada bloque admite como máximo un Documento visible para el workspace.
- [ ] Guardar bloques es atómico y actualiza `duracion_estimada` a la suma, sin tocar `sesion_detalle`.
- [ ] Los detalles legados aparecen como borrador importable y los incompletos no se pueden ejecutar.
- [ ] Entrar en `Ejecutar` o cambiar de previsualización no inicia el reloj.
- [ ] Play/Pausa, cambio explícito de bloque activo, anterior/siguiente de previsualización y salto cumplen las reglas sin dos relojes concurrentes.
- [ ] Al llegar a cero se prepara el siguiente bloque parado; el último deja la sesión completada.
- [ ] El recurso del bloque previsualizado se puede consultar antes de iniciar, sin autoplay y con apertura segura.
- [ ] El cronómetro continúa por tiempo real tras recarga/cierre y converge entre dos pestañas del mismo usuario/workspace/sesión.
- [ ] La UI funciona a 375×667 y escritorio, con foco visible, controles etiquetados, región de estado no ruidosa y `prefers-reduced-motion` respetado.
- [ ] Migración, RLS, tipos, pruebas, build, cruce BD↔UI y E2E real quedan verdes bajo perfil `full`.

## Checklist técnico

- [x] Crear y aplicar en development la migración versionada de `sesion_bloques`, RLS, grants y RPC atómica; reconciliar historial con Supabase CLI.
- [x] Regenerar `src/types/database.types.ts` desde development, sin editarlo manualmente.
- [x] Añadir tipos, Zod, cálculo de duración, firma de bloques e importador legado.
- [x] Añadir servicio/hook React Query y query key de bloques con invalidación coherente.
- [x] Sustituir el selector plano del formulario por `SesionBloquesEditor` y selector de Documento.
- [x] Implementar el estado puro, almacenamiento versionado y hook del ejecutor.
- [x] Añadir la ruta dinámica, la vista de ejecución y la acción de tabla.
- [x] Cubrir contratos con Vitest/Testing Library y el flujo con Playwright + `agent-browser`.
- [x] Actualizar backlog, auditoría CRUD, guía frontend y trazabilidad de TASK-007 al cerrar.

## Archivos afectados

### Producción permitida

- `supabase/migrations/20260808090000_sesion_bloques_ejecucion.sql`
- `src/types/database.types.ts`
- `src/types/sesion-bloques.ts`
- `src/schemas/sesion-bloques.schema.ts`
- `src/lib/sesionBloques.ts`
- `src/lib/sesionRunnerState.ts`
- `src/services/sesion-bloques.service.ts`
- `src/hooks/queryKeys.ts`
- `src/hooks/useSesionBloques.ts`
- `src/hooks/useSesionRunner.ts`
- `src/components/sesiones/SesionBloquesEditor.tsx`
- `src/components/sesiones/SesionBloqueResourcePicker.tsx`
- `src/components/sesiones/SesionEjecutarView.tsx`
- `src/components/sesiones/SesionBloqueRecurso.tsx`
- `src/components/sesiones/SesionForm.tsx`
- `src/components/sesiones/SesionesListView.tsx`
- `src/app/(dashboard)/sesiones/[sesionId]/ejecutar/page.tsx`

### Pruebas previstas

- `src/__tests__/schemas/sesion-bloques.schema.test.ts`
- `src/__tests__/lib/sesionBloques.test.ts`
- `src/__tests__/lib/sesionRunnerState.test.ts`
- `src/__tests__/services/sesion-bloques.service.test.ts`
- `src/__tests__/hooks/useSesionRunner.test.tsx`
- `src/__tests__/components/SesionBloquesEditor.test.tsx`
- `src/__tests__/components/SesionEjecutarView.test.tsx`
- `src/__tests__/components/SesionForm.test.tsx`
- `e2e/sesiones-ejecucion.spec.ts`

### Documentación de cierre

- `docs/backlog.md`
- `docs/crud-audit.md`
- `docs/design-guides/frontend_styleguide.md`
- `task/REGISTRO-TAREAS.md`
- `task/task-sesiones-bloques-ejecucion-08-08-2026.md`

## Archivos y decisiones prohibidos

- No borrar, renombrar, backfillear ni doble-escribir `sesion_detalle`.
- No usar `supabase db push`; el repositorio documenta drift y exige Management API + `migration repair`.
- No aplicar nada a producción ni reutilizar esta autorización fuera de development.
- No guardar progreso del cronómetro, URLs o documentos en Supabase.
- No permitir autoplay, dos cronómetros simultáneos ni que la previsualización controle el activo.
- No añadir una librería DnD, un reproductor de vídeo, una segunda abstracción de Documento o nuevos roles.
- No editar manualmente `database.types.ts` ni asumir APIs de Next.js anteriores a 16.
- No hacer refactors laterales del formulario, permisos, Documentos o autenticación.
- No hacer git en este flujo.

## Plan de ejecución

- Registro: TASK-007 en `task/REGISTRO-TAREAS.md`
- Plan técnico: `docs/plans/2026-08-08-sesiones-bloques-ejecucion.md`

> **ESTADO:** EN PROGRESO. La feature y la migración de development están aprobadas; la implementación se ha iniciado con `/exec`.

**Evidencia técnica (09/08/2026 Europe/Madrid):** lint y TypeScript PASS; 51 pruebas dirigidas y 546 de Vitest completas PASS; build PASS; E2E gestionado Chromium 8/8 y Mobile Chrome 8/8, sin skips; fixture e invariantes de BD PASS. La incidencia móvil anterior no se reprodujo en la build aislada y se clasificó como transitoria. La fixture utilizó los roles `admin`, `entrenador`, `gerente_sede` y `jugador`; no se documentan credenciales, identificadores ni datos personales. La tarea permanece `en_progreso`: sin confirmación humana no se marca `finalizada`; GIT=off y rama/fecha de cierre se mantienen en `—`.
