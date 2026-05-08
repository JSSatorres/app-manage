# Backlog — Manage Sport App

> Generado: 2026-05-08 | Basado en `docs/crud-audit.md`
>
> Convención de estado: `[ ]` pendiente · `[~]` en progreso · `[x]` completado

---

## BLOQUE 1 — Fundamentos transversales
> Sin esto cualquier otra tarea es más difícil de implementar correctamente.

- [ ] **B1-1** Añadir `getById` a todos los servicios existentes (sedes, equipos, sesiones, ejercicios, documentos, parámetros, usuarios)
- [ ] **B1-2** Añadir paginación (`limit` / `offset`) a todos los `fetchAll`
- [ ] **B1-3** Añadir schema Zod para `Ejercicios` (`src/schemas/ejercicio.schema.ts`)
- [ ] **B1-4** Añadir schema Zod para `Documentos` (`src/schemas/documento.schema.ts`)
- [ ] **B1-5** Añadir schema Zod para `Parámetros` (`src/schemas/parametro.schema.ts`)
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
> Solo existe `fetchUsuarios()`. No se puede gestionar el equipo desde la app.

- [ ] **B4-1** Añadir `getUserById(id)` en `src/services/usuarios.service.ts`
- [ ] **B4-2** Añadir `updateUsuario(id, input)` — editar nombre, rol, sede, teléfono
- [ ] **B4-3** Añadir `deleteUsuario(id)` — eliminar o desactivar usuario
- [ ] **B4-4** Definir y alinear el flujo de creación: invite vía `workspace_invitations` → `sync_auth_profile` → usuario creado
- [ ] **B4-5** Añadir hook `useUsuarios` / `useUsuario(id)` en `src/hooks/`
- [ ] **B4-6** Crear formulario de edición de usuario en `src/components/usuarios/UsuarioForm.tsx`
- [ ] **B4-7** Exponer edición/eliminación en la página `src/app/(dashboard)/usuarios/page.tsx`

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
