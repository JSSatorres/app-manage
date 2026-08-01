# Auditoría CRUD — Manage Sport App

> Fecha: 2026-05-08 | Rama: development
> Actualizado: 2026-07-12 tras `docs/plans/2026-07-12-auditoria-estado-y-roadmap.md` (Fases 0.5, 1.1, 1.2,
> 2.1-2.4, 3.1-3.3, 4.1-4.3). Modelo de tenant confirmado **workspace-based** (`workspace_id`).

---

## Resumen ejecutivo

| Entidad | Tipo | Get All | Get By ID | Create | Update | Delete | Schema Zod | UI/Página |
|---|---|---|---|---|---|---|---|---|
| Sedes | Core | ✅ | ✅ | ✅ | ✅ | ✅⚠ | ✅ | ✅ |
| Usuarios | Core | ✅ | ✅ | ✅‡ | ✅ | ✅‡‡ | ✅ | ✅ |
| Equipos | Core | ✅ | ✅ | ✅⚠⚠ | ✅⚠⚠ | ✅ | ✅ | ✅ |
| Sesiones | Core | ✅ | ✅ | ✅ | ✅ | ✅⚠ | ✅ | ✅ |
| Ejercicios | Core | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sesion Detalle | Relacional | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Documentos | Core | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Parámetros | Config | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Workspaces | Multi-tenant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Workspace Members | Multi-tenant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Workspace Invitations | Multi-tenant | ❌ | ❌ | ✅† | ✅† | ❌ | ❌ | ❌ |
| Superadmins | Auth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> \* `fetchParametrosByCategoria` — solo por categoría, no un getAll genérico  
> † Solo vía funciones de BD (`create_workspace_invitation`, `accept_workspace_invitation`)  
> ‡ Alta vía invitación por token (`crearInvitacion` + RPC `create_sede_invitation`), no crea la fila
> `usuarios` directamente — eso lo hace `sync_auth_profile` cuando el invitado se registra  
> ‡‡ Elimina la membresía (`workspace_members`), no la fila `usuarios` ni la cuenta de Supabase Auth
> ⚠ **Bug confirmado (2026-07-12, `docs/backlog.md` B14-12):** `deleteSede`/`deleteSesion` devuelven
> `{ data: true }` incluso si `error` no es null (falso positivo de éxito) — no corregido, fuera de
> alcance de la tarea de testing que lo detectó
> ⚠⚠ **Bug confirmado (2026-07-12, `docs/backlog.md` B14-13):** `createEquipo`/`updateEquipo` no
> persisten `workspace_id` en la tabla `equipos` pese a que el tipo lo exige — no corregido

---

## Detalle por entidad

---

### 1. Sedes

**Tabla:** `sedes`  
**Servicio:** `src/services/sedes.service.ts`  
**Schema:** `src/schemas/sede.schema.ts`  
**Tipos:** `src/types/sedes.ts`  
**Página:** `src/app/(dashboard)/sedes/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | Auto |
| nombre | TEXT | ✅ | |
| direccion | TEXT | ❌ | |
| configuracion_visual | JSONB | ❌ | default `{}` |
| responsable_id | UUID | ❌ | FK → usuarios |
| workspace_id | UUID | ✅ | FK → workspaces |
| created_at / updated_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get All | `fetchSedes(workspaceId)` | ✅ scoped por workspace (Task 1.1) |
| Get By ID | `getSedeById(id, workspaceId)` | ✅ scoped (Task 2.1) |
| Create | `createSede(input)` | ✅ RHF+Zod (Task 3.1) |
| Update | `updateSede(id, input)` | ✅ |
| Delete | `deleteSede(id)` | ✅⚠ ver nota de bug arriba (B14-12) |

#### Gaps identificados
- El campo `responsable_id` existe en BD y schema Zod pero **no se gestiona en `SedeCreateInput`/`SedeUpdateInput`** — la UI no puede asignar responsable (B5-1/B5-2/B5-3)
- `configuracion_visual` (JSONB) no tiene ningún formulario ni UI para editarlo (B5-4)
- `sede.schema.ts` usa snake_case (`workspace_id`/`responsable_id`) inconsistente con el resto de schemas — ver B14-15

---

### 2. Usuarios

**Tabla:** `usuarios` (perfil) + `workspace_members` (membresía/rol real)
**Servicio:** `src/services/usuarios.service.ts`
**Schema:** `src/schemas/user.schema.ts` (legado, sin usar en el form) · `src/schemas/usuario.schema.ts`
(edición, RHF+Zod)
**Tipos:** `src/types/usuarios.ts`
**Página:** `src/app/(dashboard)/usuarios/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | = auth.users.id |
| email | TEXT | ✅ | único |
| nombre | TEXT | ❌ | |
| rol | TEXT | ✅ | **@deprecated**, legado (SuperAdmin/AdminSede/Entrenador/Jugador) |
| sede_id | UUID | ❌ | FK → sedes (legado, no se usa en el CRUD de workspace) |
| telefono | TEXT | ❌ | |
| foto_perfil | TEXT | ❌ | URL |
| created_at / updated_at | TIMESTAMPTZ | auto | |

`workspace_members(workspace_id, user_id, role)` guarda el rol canónico (el que consultan
`useWorkspaceContext`/`can()`): `superadmin`/`admin`/`gerente_sede`/`entrenador`/`jugador`.

#### Estado del servicio (Task 2.3, B4 — 2026-07-12)
| Operación | Función | Estado |
|---|---|---|
| Get All | `fetchUsuarios(workspaceId)` | ✅ acotado a miembros del workspace, incluye `workspaceRol` |
| Get By ID | `getUsuarioById(id, workspaceId)` | ✅ |
| Create (perfil) | — | ❌ no aplica desde cliente: `usuarios.id = auth.users.id`, requiere una cuenta Auth previa |
| Create (alta con invitación) | `crearInvitacion` (`src/services/invitaciones.service.ts`) + `InvitarUsuarioDialog` | ✅ ya existía, cliente-seguro (RPC `create_sede_invitation`, token + `/register?invite=`) |
| Update (perfil) | `updateUsuario(id, workspaceId, input)` | ✅ nombre/teléfono, verifica membresía antes de mutar |
| Update (rol) | `updateUsuarioRol(workspaceId, userId, rol)` | ✅ sobre `workspace_members.role`, acotado por workspace |
| Delete | `deleteUsuario(workspaceId, userId)` | ✅ quita la membresía (`workspace_members`); no borra `usuarios` ni la cuenta de Auth |

#### Gaps identificados
- **Alta de cuentas Auth nuevas sin invitación pendiente**: crear un usuario de Supabase Auth directamente
  (sin pasar por el flujo de invitación/token) requiere la admin API con `service_role`, que no puede vivir
  en el cliente. No implementado — necesita un Route Handler server-side (mismo bloqueo que Task 0.4).
- El rol en `workspace_members` (canónico) y el rol legado en `usuarios.rol` siguen siendo dos sistemas
  separados; el CRUD nuevo solo escribe en `workspace_members` (fuente de verdad real) y dejó `usuarios.rol`
  intacto — la reconciliación completa de ambos sigue pendiente (B6-5).
- `fetchUsuarios` antes no filtraba por workspace (fuga multi-tenant); ahora exige `workspaceId` y resuelve
  la lista vía `workspace_members`.

---

### 3. Equipos

**Tabla:** `equipos`  
**Servicio:** `src/services/equipos.service.ts`  
**Schema:** `src/schemas/equipo.schema.ts`  
**Tipos:** `src/types/equipos.ts`  
**Página:** `src/app/(dashboard)/equipos/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| nombre | TEXT | ✅ | |
| categoria | TEXT | ❌ | |
| sede_id | UUID | ✅ | FK → sedes |
| entrenador_principal_id | UUID | ❌ | FK → usuarios |
| entrenador_adjunto_id | UUID | ❌ | FK → usuarios |
| created_at / updated_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get All | `fetchEquiposByWorkspace(workspaceId, {page,pageSize}?)` | ✅ scoped + paginación opcional (Task 1.1/2.4) |
| Get By ID | `getEquipoById(id, workspaceId)` | ✅ scoped (Task 2.1) |
| Create | `createEquipo(input)` | ✅⚠⚠ RHF+Zod (Task 3.1), pero NO persiste `workspace_id` — ver bug B14-13 |
| Update | `updateEquipo(id, input)` | ✅⚠⚠ mismo bug que Create |
| Delete | `deleteEquipo(id)` | ✅ |
| Lookup | `fetchEquiposLookupBySedeIds(sedeIds)` | ✅ |

#### Gaps identificados
- **Bug B14-13**: `createEquipo`/`updateEquipo` no escriben `workspace_id` en la tabla `equipos` pese a
  que `EquipoCreateInput`/`EquipoUpdateInput` lo exigen — pendiente de fix
- Entidad "jugadores" **ya existe** (tabla, servicio, schema, UI — RHF+Zod desde Task 3.1); este gap del
  audit original (2026-05-08) está resuelto, la tabla resumen de arriba lo refleja

---

### 4. Sesiones

**Tabla:** `sesiones`  
**Servicio:** `src/services/sesiones.service.ts`  
**Schema:** `src/schemas/sesion.schema.ts`  
**Tipos:** `src/types/sesiones.ts`  
**Página:** `src/app/(dashboard)/sesiones/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| fecha | DATE | ✅ | |
| hora_inicio | TIME | ❌ | |
| duracion_estimada | INTEGER | ❌ | minutos |
| equipo_id | UUID | ✅ | FK → equipos |
| entrenador_id | UUID | ✅ | FK → usuarios |
| microciclo | INTEGER | ❌ | 1–52 |
| periodo_temporada | TEXT | ❌ | Pretemporada / Competición |
| objetivo_sesion | TEXT | ❌ | |
| observaciones_previas | TEXT | ❌ | |
| feedback_post_entreno | TEXT | ❌ | |
| estado | TEXT | ✅ | Borrador / Planificada / Realizada |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get All | `fetchSesionesBySedeIds(sedeIds)` | ✅ |
| Get By ID | `getSesionById(id, workspaceId)` | ✅ scoped vía `equipo_id`→workspace (Task 2.1) |
| Create | `createSesion(input)` | ✅ RHF+Zod, `entrenadorIds` array (Task 1.2/3.1) |
| Update | `updateSesion(id, input)` | ✅ |
| Delete | `deleteSesion(id)` | ✅⚠ ver nota de bug arriba (B14-12) |

#### Gaps identificados
- **`sesion_detalle` completamente sin implementar** — es la tabla que vincula sesiones con ejercicios (el corazón de la funcionalidad)
- No existe servicio para gestionar los ejercicios dentro de una sesión (añadir, reordenar, eliminar, editar variantes)
- No hay transición de estado controlada (Borrador → Planificada → Realizada)

---

### 5. Sesion Detalle

**Tabla:** `sesion_detalle`  
**Servicio:** ninguno  
**Schema:** ninguno  
**Tipos:** ninguno (solo en `database.types.ts`)  
**Página:** ninguna dedicada

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| sesion_id | UUID | ✅ | FK → sesiones |
| ejercicio_id | UUID | ✅ | FK → ejercicios |
| orden | INTEGER | ✅ | UNIQUE con sesion_id |
| tiempo_ejecucion | INTEGER | ❌ | minutos |
| tiempo_descanso | INTEGER | ❌ | minutos |
| variante_aplicada | TEXT | ❌ | descripción de variante |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get by Sesion | — | ❌ falta |
| Add Ejercicio | — | ❌ falta |
| Update Orden | — | ❌ falta |
| Update Detalle | — | ❌ falta |
| Remove Ejercicio | — | ❌ falta |
| Bulk Replace | — | ❌ falta |

#### Gaps identificados
- **Todo por construir** — esta entidad es clave para la lógica de negocio principal
- Necesita operación atómica para reordenar ejercicios dentro de una sesión
- Necesita operación de reemplazo masivo (guardar todos los detalles de una sesión a la vez)

---

### 6. Ejercicios

**Tabla:** `ejercicios`  
**Servicio:** `src/services/ejercicios.service.ts`  
**Schema:** ninguno en `src/schemas/`  
**Tipos:** `src/types/ejercicios.ts`  
**Página:** `src/app/(dashboard)/ejercicios/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| titulo | TEXT | ✅ | |
| descripcion_detallada | TEXT | ❌ | |
| representacion_grafica | TEXT | ❌ | URL/drive_id |
| objetivo_principal | TEXT | ❌ | |
| objetivos_secundarios | TEXT[] | ❌ | array |
| contenido_tactico | TEXT | ❌ | |
| contenido_tecnico | TEXT | ❌ | |
| contenido_fisico | TEXT | ❌ | |
| dimensiones_campo | TEXT | ❌ | |
| numero_jugadores_min | INTEGER | ❌ | |
| material_necesario | TEXT[] | ❌ | array |
| drive_video_id | TEXT | ❌ | |
| drive_image_id | TEXT | ❌ | |
| sede_propietaria_id | UUID | ❌ | FK → sedes |
| sedes_ocultas | UUID[] | ❌ | array de FK |
| es_global | BOOLEAN | ❌ | default false |
| workspace_id | UUID | ✅ | FK → workspaces |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get All | `fetchEjercicios(workspaceId)` | ✅ |
| Get By ID | `getEjercicioById(id, workspaceId)` | ✅ scoped (Task 2.1) |
| Create | `createEjercicio(input)` | ✅ RHF+Zod (Task 3.1) |
| Update | `updateEjercicio(id, input)` | ✅ |
| Delete | `deleteEjercicio(id)` | ✅ |

#### Gaps identificados
- Schema Zod: `src/schemas/ejercicio.schema.ts` (Task 2.2) — gap cerrado
- La integración con Google Drive (`drive_video_id`, `drive_image_id`, `representacion_grafica`) está definida en BD pero el adaptador `driveAdapter.ts` lanza errores — completamente sin implementar
- La lógica de visibilidad (`sedes_ocultas`, `es_global`, `sede_propietaria_id`) no tiene servicio que la gestione
- Los campos de arrays (objetivos_secundarios, material_necesario) no tienen UI para edición

---

### 7. Documentos

**Tabla:** `documentos`  
**Servicio:** `src/services/documentos.service.ts`  
**Schema:** ninguno en `src/schemas/`  
**Tipos:** `src/types/documentos.ts`  
**Página:** `src/app/(dashboard)/documentos/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| titulo | TEXT | ✅ | |
| categoria_doc | TEXT | ❌ | |
| drive_file_id | TEXT | ❌ | ID del archivo en Drive |
| permisos_roles | JSONB | ❌ | default `[]` |
| sede_id | UUID | ❌ | FK → sedes |
| created_at / updated_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get All | `fetchDocumentosBySedeIds(sedeIds)` | ✅ |
| Get By ID | `getDocumentoById(id, workspaceId)` | ✅ scoped, incluye globales (Task 2.1) |
| Create | `createDocumento(input)` | ✅ RHF+Zod, resolver dinámico file/link (Task 2.2/3.1) |
| Update | `updateDocumento(id, input)` | ✅ |
| Delete | `deleteDocumento(id)` | ✅ |

#### Gaps identificados
- Schema Zod: `src/schemas/documento.schema.ts` (Task 2.2, 3 variantes file/link/update) — gap cerrado
- `drive_file_id` requiere integración con Google Drive que no está implementada
- `permisos_roles` (JSONB) no tiene UI para gestionar permisos por rol

---

### 8. Parámetros del Sistema

**Tabla:** `parametros_sistema`  
**Servicio:** `src/services/parametros.service.ts`  
**Schema:** ninguno en `src/schemas/`  
**Tipos:** `src/types/parametros.ts`  
**Página:** `src/app/(dashboard)/parametros/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| categoria | TEXT | ✅ | |
| nombre | TEXT | ✅ | |
| activo | BOOLEAN | ❌ | default true |
| sede_id | UUID | ❌ | FK → sedes (null = global) |
| workspace_id | UUID | ✅ | FK → workspaces |
| created_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get by Categoría | `fetchParametrosByCategoria(cat, wsId)` | ✅ |
| Get All | — | ❌ falta (B1-6) |
| Get By ID | `getParametroById(id, workspaceId)` | ✅ scoped (Task 2.1) |
| Create | `createParametro(input)` | ✅ RHF+Zod (Task 3.1) |
| Update | `updateParametro(id, input)` | ✅ |
| Delete | `deleteParametro(id)` | ✅ |

#### Gaps identificados
- No existe un `fetchAllParametros` — la lectura siempre requiere filtrar por categoría (B1-6)
- Schema Zod: `src/schemas/parametro.schema.ts` (Task 2.2) — gap cerrado
- La distinción entre parámetros globales (sede_id = null) y por sede no tiene UI diferenciada

---

### 9. Workspaces

**Tabla:** `workspaces`  
**Servicio:** ninguno  
**Schema:** ninguno  
**Tipos:** solo en `database.types.ts`  
**Página:** ninguna

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| name | TEXT | ✅ | |
| created_at / updated_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get All | — | ❌ falta |
| Get By ID | — | ❌ falta |
| Create | — | ❌ falta |
| Update | — | ❌ falta |
| Delete | — | ❌ falta |

#### Gaps identificados
- **Todo por construir**
- El workspace activo se obtiene del contexto (`useWorkspaceContext`) pero sin un servicio CRUD no se puede gestionar desde la UI
- No hay página de configuración del workspace (nombre, logo, etc.)

---

### 10. Workspace Members

**Tabla:** `workspace_members`  
**Servicio:** ninguno  
**Schema:** ninguno  
**Tipos:** solo en `database.types.ts`  
**Página:** ninguna

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| workspace_id | UUID | PK, FK | |
| user_id | UUID | PK, FK | |
| role | TEXT | ✅ | superadmin / admin / entrenador / jugador |
| created_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get Members | — | ❌ falta |
| Add Member | — | ❌ solo vía invitación |
| Update Role | — | ❌ falta |
| Remove Member | — | ❌ falta |

#### Gaps identificados
- No hay servicio para gestionar miembros del workspace
- El sistema de roles en `workspace_members` (superadmin/admin/entrenador/jugador) es diferente al de `usuarios.rol` (SuperAdmin/AdminSede/Entrenador) — inconsistencia sin capa de abstracción

---

### 11. Workspace Invitations

**Tabla:** `workspace_invitations`  
**Servicio:** parcialmente vía funciones de BD  
**Schema:** ninguno  
**Tipos:** solo en `database.types.ts`  
**Página:** `/join`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | |
| workspace_id | UUID | ✅ | FK |
| email | TEXT | ✅ | |
| token | TEXT | ✅ | único |
| role | TEXT | ✅ | |
| invited_by | UUID | ❌ | FK → auth.users |
| expires_at | TIMESTAMPTZ | ✅ | |
| accepted_at | TIMESTAMPTZ | ❌ | null hasta aceptar |
| created_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Create Invitation | `create_workspace_invitation()` (RPC) | ✅ |
| Accept Invitation | `accept_workspace_invitation()` (RPC) | ✅ |
| List Invitations | — | ❌ falta |
| Revoke Invitation | — | ❌ falta |
| Resend Invitation | — | ❌ falta |

#### Gaps identificados
- No hay UI para ver o gestionar invitaciones pendientes
- No hay forma de revocar una invitación desde la aplicación
- No hay notificación por email en el flujo actual (depende de implementación externa)

---

## Entidades de negocio faltantes

> **Nota (2026-07-12):** Jugadores y Entrenadores **ya existen** (tabla, servicio, schema, hook, UI con
> RHF+Zod) desde antes de esta auditoría — la sección original de 2026-05-08 quedó obsoleta en ese punto.
> Se conserva el resto de esta sección (Temporadas, Asistencia, Convocatorias) porque sigue vigente.

Estas entidades tienen relevancia para la lógica de negocio deportiva pero **no existen en absoluto** en el schema actual:

### Temporadas
Sin temporadas no hay contexto temporal para sesiones, microciclos ni estadísticas.

**Campos mínimos necesarios:**
```
temporadas
  id, nombre, fecha_inicio, fecha_fin,
  equipo_id, workspace_id, activa (boolean),
  created_at, updated_at
```

### Asistencia a Sesiones
No hay forma de registrar qué jugadores asistieron a cada sesión.

**Campos mínimos necesarios:**
```
sesion_asistencia
  id, sesion_id, jugador_id,
  asistio (boolean), motivo_ausencia, created_at
```

### Convocatorias / Partidos
No existe entidad para partidos o convocatorias de jugadores a eventos.

---

## Priorización de trabajo

### Prioridad Alta — Bloquea funcionalidad core

| # | Tarea | Por qué |
|---|---|---|
| 1 | Crear tipo + servicio + schema para `sesion_detalle` | Sin esto la sesión está vacía — es el núcleo del producto |
| 2 | Crear entidad `Jugadores` (tabla + servicio + schema + UI) | Un equipo sin jugadores no tiene sentido funcional |
| 3 | CRUD completo de `Usuarios` (update, delete) | Solo hay lectura; no se puede gestionar el equipo |
| 4 | `getById` para Sesiones, Equipos, Sedes, Ejercicios | Necesario para cualquier vista de detalle o edición |

### Prioridad Media — Completa la lógica de negocio

| # | Tarea | Por qué |
|---|---|---|
| 5 | Schemas Zod para Ejercicios, Documentos, Parámetros | Validación incompleta en formularios |
| 6 | Gestión de `Workspace Members` (UI + servicio) | Sin esto no se puede administrar quién accede |
| 7 | Crear entidad `Temporadas` | Da contexto al microciclo y período de temporada |
| 8 | Gestión de invitaciones (listar, revocar) | Flujo de onboarding incompleto |
| 9 | `sesion_asistencia` — registro de asistencia | Dato fundamental para análisis de rendimiento |

### Prioridad Baja — Mejora la experiencia

| # | Tarea | Por qué |
|---|---|---|
| 10 | Integración Google Drive (`driveAdapter`) | Necesario para subir ejercicios y documentos con archivos |
| 11 | Gestión de `Workspaces` (CRUD de workspace) | Actualmente no se puede crear ni editar el workspace desde la UI |
| 12 | `configuracion_visual` de Sedes | Personalización de la app por sede |
| 13 | Lógica de visibilidad de ejercicios (`sedes_ocultas`) | Funcionalidad avanzada de biblioteca compartida |
| 14 | Transiciones de estado en Sesiones | Flujo Borrador → Planificada → Realizada |

---

## Gaps transversales

| Gap | Descripción |
|---|---|
| Sin `getById` universal | Ninguna entidad implementa lectura por ID individual |
| Sin paginación | Todos los `fetchAll` devuelven sin límite |
| Sin filtros/búsqueda | No hay endpoint de búsqueda en ninguna entidad |
| `driveAdapter` es un stub | Todos los métodos lanzan `Error('not implemented')` |
| Roles duplicados | `usuarios.rol` vs `workspace_members.role` — dos sistemas sin sincronía |
| Sin soft delete | Todas las eliminaciones son `DELETE` definitivo — sin papelera |
| Sin auditoría | No hay tabla de log de cambios |
