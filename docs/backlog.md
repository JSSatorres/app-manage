# Backlog — Manage Sport App

> Generado: 2026-05-08 | Basado en `docs/crud-audit.md`
>
> Convención de estado: `[ ]` pendiente · `[~]` en progreso · `[x]` completado

---

## BLOQUE 1 — Fundamentos transversales
> Sin esto cualquier otra tarea es más difícil de implementar correctamente.

- [x] **B1-1** `getById` scoped por tenant en sedes, equipos, sesiones, ejercicios, documentos, parámetros,
  usuarios (`getSedeById`, `getEquipoById`, `getSesionById`, `getEjercicioById`, `getDocumentoById`,
  `getParametroById`, `getUsuarioById`) — Task 2.1, 2026-07-12
- [~] **B1-2** Paginación server-side (`limit`/`offset` con `.range()`) cableada end-to-end solo en
  Jugadores/Equipos/Entrenadores (Task 2.4, 2026-07-12); solo tiene efecto sin sede activa filtrada (con
  sede activa, `DataTable` sigue en modo cliente para no romper la búsqueda sobre el dataset completo).
  Patrón listo (`src/types/pagination.ts`) para replicar en sedes/usuarios/ejercicios/documentos/parámetros/sesiones
- [x] **B1-3** Schema Zod para `Ejercicios` (`src/schemas/ejercicio.schema.ts`) — Task 2.2, 2026-07-12
- [x] **B1-4** Schema Zod para `Documentos` (`src/schemas/documento.schema.ts`, 3 variantes: file/link/update)
  — Task 2.2, 2026-07-12
- [x] **B1-5** Schema Zod para `Parámetros` (`src/schemas/parametro.schema.ts`) — Task 2.2, 2026-07-12
- [ ] **B1-6** Crear `fetchAllParametros(workspaceId)` — lectura completa sin filtrar por categoría

---

## BLOQUE 2 — Sesion Detalle (núcleo del producto)
> La tabla `sesion_detalle` es el corazón del sistema. Sin ella las sesiones son cáscaras vacías.

- [ ] **B2-1** Crear tipo `SesionDetalle` en `src/types/sesion-detalle.ts`
- [ ] **B2-2** Crear schema Zod en `src/schemas/sesion-detalle.schema.ts`
- [ ] **B2-3** Crear `src/services/sesion-detalle.service.ts` con:
  - [ ] `fetchDetallesBySesionId(sesionId)`
  - [ ] `addEjercicioToSesion(input)` — insert single
  - [ ] `updateDetalle(id, input)` — editar tiempo, variante
  - [ ] `removeEjercicioFromSesion(id)`
  - [ ] `bulkReplaceSesionDetalle(sesionId, detalles[])` — reemplazar todos (para reordenar)
- [ ] **B2-4** Crear hook `useSesionDetalle(sesionId)` en `src/hooks/`
- [ ] **B2-5** Crear componente `SesionDetalleEditor` — lista de ejercicios con drag & drop para reordenar
- [ ] **B2-6** Integrar editor en la página de sesión (`src/app/(dashboard)/sesiones/[id]/page.tsx`)
- [ ] **B2-7** Añadir transición de estado controlada: Borrador → Planificada → Realizada (con confirmación UI)

---

## BLOQUE 3 — Jugadores (entidad faltante crítica)
> Un equipo deportivo sin jugadores no tiene sentido. Esta entidad no existe en ninguna capa.

- [ ] **B3-1** Escribir y aplicar migración SQL: tabla `jugadores`
  ```sql
  -- campos: id, nombre, apellido, fecha_nacimiento, posicion,
  --         dorsal, equipo_id, sede_id, workspace_id,
  --         foto_perfil, telefono, email,
  --         estado (activo/lesionado/baja), created_at, updated_at
  -- RLS: misma política que equipos (por workspace_members)
  ```
- [ ] **B3-2** Regenerar `src/types/database.types.ts` tras la migración
- [ ] **B3-3** Crear `src/types/jugadores.ts`
- [ ] **B3-4** Crear `src/schemas/jugador.schema.ts`
- [ ] **B3-5** Crear `src/services/jugadores.service.ts` con CRUD completo + `fetchJugadoresByEquipo(equipoId)`
- [ ] **B3-6** Crear hook `useJugadores` en `src/hooks/`
- [ ] **B3-7** Crear componentes en `src/components/jugadores/` (ListView, Form)
- [ ] **B3-8** Crear página `src/app/(dashboard)/jugadores/page.tsx`
- [ ] **B3-9** Añadir sección de jugadores dentro de la vista de detalle de equipo

---

## BLOQUE 4 — Usuarios (CRUD completo)
> CRUD cliente-seguro cerrado (Task 2.3, 2026-07-12): editar perfil/rol y quitar del workspace.
> El alta de cuentas nuevas de Auth sigue pendiente de decisión server-side (ver B4-4).

- [x] **B4-1** Añadir `getUserById(id)` en `src/services/usuarios.service.ts` — `getUsuarioById(id, workspaceId)`
- [x] **B4-2** Añadir `updateUsuario(id, input)` — edita nombre/teléfono (`updateUsuario`); el rol vive en
  `workspace_members` y se edita con `updateUsuarioRol(workspaceId, userId, rol)` (no hay `sede_id` en el
  modelo de workspaces)
- [x] **B4-3** Añadir `deleteUsuario(id)` — `deleteUsuario(workspaceId, userId)` quita la membresía
  (`workspace_members`); NO borra la fila `usuarios` ni la cuenta de Supabase Auth (requeriría admin API
  con `service_role`, fuera de alcance del cliente)
- [ ] **B4-4** Definir y alinear el flujo de creación de cuentas nuevas de Auth: requiere un Route Handler
  server-side con `service_role` (mismo bloqueo que Task 0.4). Mientras las altas estén cerradas,
  `InvitarUsuarioDialog` informa de la pausa y dirige a `/landing#lista-espera`; el token existente se
  conserva en datos, pero `/register?invite=` ya no permite crear cuentas.
- [x] **B4-5** Añadir hook `useUsuarios` / `useUsuario(id)` en `src/hooks/` — `useUsuarios(workspaceId)` con
  `updateOne`/`deleteOne`
- [x] **B4-6** Crear formulario de edición de usuario en `src/components/usuarios/UsuarioForm.tsx` (RHF + Zod)
- [x] **B4-7** Exponer edición/eliminación en la página `src/app/(dashboard)/usuarios/page.tsx` (vía
  `UsuariosListView` — acciones Editar/Quitar en `DataTable`)

---

## BLOQUE 5 — Sedes (completar campos faltantes)
> El CRUD básico existe pero campos relevantes no se gestionan.

- [ ] **B5-1** Añadir `responsable_id` a `SedeCreateInput` / `SedeUpdateInput` en `src/types/sedes.ts`
- [ ] **B5-2** Actualizar `createSedeSchema` / `updateSedeSchema` para incluir `responsable_id`
- [ ] **B5-3** Actualizar el formulario de sedes para permitir seleccionar responsable (dropdown de usuarios)
- [ ] **B5-4** Crear UI para editar `configuracion_visual` (colores, logo de sede)

---

## BLOQUE 6 — Workspace Members e Invitaciones
> Sin gestión de miembros el onboarding está roto y no se puede administrar el acceso.

- [ ] **B6-1** Crear `src/services/workspace-members.service.ts` con:
  - [ ] `fetchMembersByWorkspace(workspaceId)`
  - [ ] `updateMemberRole(workspaceId, userId, newRole)`
  - [ ] `removeMember(workspaceId, userId)`
- [ ] **B6-2** Crear `src/services/workspace-invitations.service.ts` con:
  - [ ] `fetchInvitacionesPendientes(workspaceId)`
  - [ ] `revokeInvitation(invitationId)`
  - [ ] `resendInvitation(invitationId)` — recrear token y enviar email
- [ ] **B6-3** Crear schemas Zod para invitaciones y miembros
- [ ] **B6-4** Crear página `src/app/(dashboard)/configuracion/miembros/page.tsx` con:
  - [ ] Lista de miembros con su rol y opción de cambiar rol / expulsar
  - [ ] Lista de invitaciones pendientes con opción de revocar / reenviar
  - [ ] Formulario para invitar nuevo miembro (email + rol)
- [ ] **B6-5** Resolver inconsistencia de roles: alinear `usuarios.rol` con `workspace_members.role` o documentar cuándo aplica cada uno

---

## BLOQUE 7 — Temporadas
> Sin temporadas el microciclo y período de temporada en sesiones no tienen contexto.

- [ ] **B7-1** Escribir migración SQL: tabla `temporadas`
  ```sql
  -- campos: id, nombre, fecha_inicio, fecha_fin,
  --         equipo_id, workspace_id, activa (boolean),
  --         created_at, updated_at
  ```
- [ ] **B7-2** Regenerar `src/types/database.types.ts`
- [ ] **B7-3** Crear `src/types/temporadas.ts`
- [ ] **B7-4** Crear `src/schemas/temporada.schema.ts`
- [ ] **B7-5** Crear `src/services/temporadas.service.ts` con CRUD completo
- [ ] **B7-6** Vincular temporada activa al contexto de sesión (selector en formulario de sesión)

---

## BLOQUE 8 — Asistencia a Sesiones
> Dato fundamental para analizar participación y rendimiento de jugadores.

- [ ] **B8-1** Escribir migración SQL: tabla `sesion_asistencia`
  ```sql
  -- campos: id, sesion_id, jugador_id,
  --         asistio (boolean), motivo_ausencia, created_at
  -- UNIQUE(sesion_id, jugador_id)
  ```
- [ ] **B8-2** Regenerar `src/types/database.types.ts`
- [ ] **B8-3** Crear `src/types/sesion-asistencia.ts`
- [ ] **B8-4** Crear `src/schemas/sesion-asistencia.schema.ts`
- [ ] **B8-5** Crear `src/services/sesion-asistencia.service.ts` con:
  - [ ] `fetchAsistenciaBySesion(sesionId)`
  - [ ] `registrarAsistencia(sesionId, jugadorId, asistio, motivo?)`
  - [ ] `bulkRegistrarAsistencia(sesionId, registros[])` — guardar todos a la vez
- [ ] **B8-6** Crear componente de lista de asistencia dentro de la vista de sesión

---

## BLOQUE 9 — Ejercicios (completar campos avanzados)
> El CRUD básico funciona pero campos ricos de la tabla no se gestionan.

- [ ] **B9-1** Actualizar `EjercicioCreateInput` para incluir todos los campos de la tabla (objetivos_secundarios, material_necesario, contenido_tactico, etc.)
- [ ] **B9-2** Actualizar formulario de ejercicio para editar campos de arrays (`objetivos_secundarios`, `material_necesario`) con inputs dinámicos (añadir/quitar items)
- [ ] **B9-3** Añadir campo `dimensiones_campo` al formulario
- [ ] **B9-4** Crear UI para gestionar visibilidad del ejercicio: `es_global`, `sede_propietaria_id`, `sedes_ocultas`

---

## BLOQUE 10 — Google Drive (driveAdapter)
> `driveAdapter.ts` existe pero todos los métodos lanzan `Error('not implemented')`.

- [ ] **B10-1** Definir estrategia de integración: OAuth de servicio vs. OAuth por usuario
- [ ] **B10-2** Implementar `uploadFile(input)` en `src/services/driveAdapter.ts`
- [ ] **B10-3** Implementar `deleteFile(id)`
- [ ] **B10-4** Implementar `getFileMetadata(id)`
- [ ] **B10-5** Integrar upload de imagen/video en el formulario de `Ejercicios`
- [ ] **B10-6** Integrar upload de archivo en el formulario de `Documentos`
- [ ] **B10-7** Añadir variables de entorno necesarias en `.env.local` y documentar en `.env.example`

---

## BLOQUE 11 — Documentos (permisos y mejoras)

- [ ] **B11-1** Definir estructura del JSONB `permisos_roles` y crear tipo TypeScript
- [ ] **B11-2** Crear UI para asignar permisos de documento por rol
- [ ] **B11-3** Aplicar filtrado de documentos según rol del usuario autenticado en `fetchDocumentosBySedeIds`

---

## BLOQUE 12 — Workspaces (gestión desde la UI)
> Actualmente no se puede crear ni editar un workspace desde la aplicación.

- [ ] **B12-1** Crear `src/services/workspaces.service.ts` con:
  - [ ] `fetchWorkspaceById(id)`
  - [ ] `updateWorkspace(id, input)` — nombre, configuración
- [ ] **B12-2** Crear schema Zod para workspace
- [ ] **B12-3** Añadir sección de configuración general del workspace en `/configuracion`

---

## BLOQUE 13 — Calidad y seguridad

- [ ] **B13-1** Auditar todas las políticas RLS en Supabase — actualmente son permisivas, endurecer por rol
- [ ] **B13-2** Añadir soft delete (`deleted_at`) a entidades core (sedes, equipos, usuarios, ejercicios)
- [ ] **B13-3** Añadir búsqueda/filtrado en los `fetchAll` principales (sesiones por fecha, equipos por sede, ejercicios por objetivo)
- [ ] **B13-4** Añadir tests unitarios para todos los servicios nuevos
- [ ] **B13-5** Añadir tests E2E para los flujos críticos (crear sesión + añadir ejercicios + registrar asistencia)

---

## BLOQUE 14 — Auditoría 2026-07-12 (seguridad, deuda técnica, tests)
> Origen: `docs/plans/2026-07-12-auditoria-estado-y-roadmap.md`. Modelo de tenant confirmado
> **workspace-based** (`workspace_id`), no `sede_id` como asumía el diagnóstico inicial del plan —
> `workspace_members`/`workspaces` existen y están en uso real.

**Seguridad**
- [~] **B14-1 (C1)** Secretos: `.env`/`.env.local` nunca estuvieron en el historial de git y ya están
  gitignored + `.env.example` existe. **Pendiente**: rotar los tokens vivos (Supabase, Google OAuth,
  Sentry, OpenCode/Kimi/MiniMax) — decisión del usuario, no ejecutado (2026-07-12: "0 rotación" por ahora).
- [ ] **B14-2 (C2/0.4)** Middleware de auth en servidor — **bloqueado**: la sesión vive en `localStorage`
  (`@supabase/supabase-js` con `persistSession: true`), no hay `@supabase/ssr` ni cookies, el callback OAuth
  es una página cliente. Un middleware/`proxy.ts` (Next 16 renombró `middleware`→`proxy`) no puede leer la
  sesión sin antes migrar el modelo a cookies. Requiere decisión arquitectónica del usuario.
- [ ] **B14-3 (C3/0.2)** Reconciliar drift de migraciones vs BD remota real — no se tocó la BD remota en
  este lote (fuera de alcance de `/exec` autónomo). Sigue pendiente auditar con Management API.
- [ ] **B14-4 (A2/1.3)** Verificar orden/vigencia de RLS por rol (`021_rls_por_rol.sql` vs `APPLY_NOW.sql`)
  contra la BD remota real — no ejecutado (mutación de BD compartida, requiere autorización explícita).
- [x] **B14-5 (A3)** Fugas multi-tenant cerradas: `equipos`, `jugadores`, `entrenadores`, `sedes`,
  `usuarios-lookup`, `sedes-lookup` ahora filtran por `workspace_id` (Task 1.1, 2026-07-12). Los antiguos
  `fetchAllX` sin filtro eran código muerto duplicado de import/export y se eliminaron.
- [x] **B14-6 (M2)** Sentry endurecido: `tracesSampleRate` NODE_ENV-aware (0.1 en prod) y
  `sendDefaultPii: false` (RGPD) en los 3 configs — Task 0.5, 2026-07-12.

**Deuda técnica**
- [x] **B14-7** Los 8 formularios de dominio migrados a RHF + Zod + shadcn/ui (Task 3.1, 2026-07-12):
  `EntrenadorForm`, `SedeForm`, `JugadorForm`, `EquipoForm`, `EjercicioForm`, `DocumentoForm`,
  `ParametroForm`, `SesionForm`. `sesion.schema.ts` normalizado de snake_case a camelCase de paso.
- [x] **B14-8** Accesibilidad: `FormField` asocia `label htmlFor`↔`id` (vía `useId()`), `DataTable` con
  roles/atributos ARIA (`scope="col"`, `aria-sort`, `aria-live`, navegación por teclado) — Task 3.2,
  2026-07-12.
- [x] **B14-9** Inputs nativos → shadcn/ui: barrido completo, migrados `InvitarUsuarioDialog` y
  `SesionDocumentosPanel` (los únicos 2 forms de dominio pendientes fuera de los 8 de B14-7) — Task 3.3,
  2026-07-12. Quedan como casos especiales legítimos sin migrar: `<input type="file">` (avatar, import
  Excel), inputs de búsqueda de bajo nivel en `DataTable`/`MultiSelect`, checkbox nativo estilizado en
  `MultiCheckboxList`.
- [x] **B14-10** +48 tests unitarios de servicios críticos (sesiones/equipos/sedes/jugadores/entrenadores,
  create/update/delete + lógica de negocio) — Task 4.1. +40 tests de schemas Zod restantes
  (sede/equipo/usuario) — Task 4.2. Total suite: 28 archivos / 215 tests, 2026-07-12.
- [x] **B14-11** E2E de RBAC (admin vs entrenador), logout (limpia `localStorage`, redirect client-side) y
  callback OAuth (código inválido/ausente no crashea) — `e2e/rbac.spec.ts`, `e2e/auth.spec.ts`, Task 4.3,
  2026-07-12. Ejecutado en vivo: 10/10 passed.

**Bugs encontrados durante Task 4.1/4.2 (confirmados, NO corregidos — fuera de alcance de tareas de testing)**
- [ ] **B14-12** `deleteSesion` (`src/services/sesiones.service.ts`) y `deleteSede`
  (`src/services/sedes.service.ts`) devuelven `{ data: true }` **incluso si `error` no es null** — falso
  positivo de éxito. Contraste: `deleteEquipo`/`deleteJugador`/`deleteEntrenador` sí devuelven
  `{ data: !error, error }` correctamente. Fix: alinear las 2 funciones al patrón correcto.
- [ ] **B14-13** `createEquipo`/`updateEquipo` (`src/services/equipos.service.ts`) nunca persisten
  `input.workspaceId` en la tabla `equipos` (el insert/update solo envía `nombre`, `categoria`, `sede_id`),
  pese a que `EquipoCreateInput`/`EquipoUpdateInput` lo exigen. Los equipos nuevos quedan con
  `workspace_id = NULL` en BD. Relevante para el scope multi-tenant de B14-5 — revisar si hay
  trigger/default en BD que lo derive de `sede_id`, y si no, fijarlo explícitamente en el servicio.
- [ ] **B14-14** `usuario.schema.ts` (`editUsuarioSchema`, en uso real) y `user.schema.ts`
  (`usuarioSchema`/`createUsuarioSchema`/`updateUsuarioSchema`, sin consumidor real detectado) conviven —
  revisar si `user.schema.ts` es legado a eliminar.
- [ ] **B14-15** `sede.schema.ts` usa `workspace_id`/`responsable_id` (snake_case) mientras
  `SedeCreateInput` (`src/types/sedes.ts`) usa `workspaceId` camelCase y no tiene `responsable_id` — no
  rompe en runtime (`SedeForm` hace `.omit()` de esos campos antes de validar) pero es inconsistente con
  el resto de schemas del proyecto (camelCase). Alinear cuando se aborde B5-1/B5-2.

## BLOQUE 15 — Landing pública de SportApp

- [x] **B15-1** Renovar `/landing` con la identidad cromática de SportApp, fotografía multideporte, explicación del uso de móvil/tableta durante el entrenamiento y capturas de producto recortadas para eliminar áreas vacías (01/08/2026).
- [x] **B15-2** Simplificar la presentación comercial de perfiles y renovar el pie de página: sin Super Admin/Admin, registro dirigido a la lista de espera y acceso reservado a cuentas habilitadas (01/08/2026).
- [x] **B15-3** Sustituir la comparación tabular de Excel/Drive por un mapa visual de herramientas dispersas frente a módulos conectados de SportApp (01/08/2026).
- [x] **B15-4** Cerrar temporalmente todas las altas públicas: `/register` y CTA residuales redirigen a
  `/landing#lista-espera`, y el login conserva email/contraseña y Google para cuentas existentes. Código,
  unit, build y E2E desktop/móvil verificados el 01/08/2026. Supabase Auth confirmado con
  `disable_signup=true`, email habilitado y Google habilitado.
- [x] **B15-4** Reemplazar la captura vacía de ejercicios por una ilustración que comunica biblioteca deportiva e información guardada (01/08/2026).
- [x] **B15-5** Corregir las anclas de navegación de la landing y compensar la cabecera fija en los destinos (01/08/2026).
- [x] **B15-6** Integrar el símbolo oficial de Satorus en el pie y corregir jerarquía, contraste y espaciado del nodo central de SportApp (01/08/2026).

## Orden de ejecución recomendado

```
B1  →  B2  →  B3  →  B4
             ↓
            B5  →  B6  →  B7
                         ↓
                        B8  →  B9  →  B10
                                      ↓
                                   B11 · B12 · B13
```

Los bloques B1–B4 son bloqueantes. El resto puede paralelizarse una vez desbloqueados.
