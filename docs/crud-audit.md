# Auditoría CRUD — Manage Sport App

> Fecha: 2026-05-08 | Rama: development

---

## Resumen ejecutivo

| Entidad | Tipo | Get All | Get By ID | Create | Update | Delete | Schema Zod | UI/Página |
|---|---|---|---|---|---|---|---|---|
| Sedes | Core | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Usuarios | Core | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Equipos | Core | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sesiones | Core | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ejercicios | Core | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Sesion Detalle | Relacional | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Documentos | Core | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Parámetros | Config | ✅* | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Workspaces | Multi-tenant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Workspace Members | Multi-tenant | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Workspace Invitations | Multi-tenant | ❌ | ❌ | ✅† | ✅† | ❌ | ❌ | ❌ |
| Superadmins | Auth | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> \* `fetchParametrosByCategoria` — solo por categoría, no un getAll genérico  
> † Solo vía funciones de BD (`create_workspace_invitation`, `accept_workspace_invitation`)

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
| Get All | `fetchSedes(workspaceId)` | ✅ |
| Get By ID | — | ❌ falta |
| Create | `createSede(input)` | ✅ |
| Update | `updateSede(id, input)` | ✅ |
| Delete | `deleteSede(id)` | ✅ |

#### Gaps identificados
- No existe `getSedeById` — necesario para vista de detalle y formulario de edición con datos precargados
- El campo `responsable_id` existe en BD y schema Zod pero **no se gestiona en `SedeCreateInput`/`SedeUpdateInput`** — la UI no puede asignar responsable
- `configuracion_visual` (JSONB) no tiene ningún formulario ni UI para editarlo

---

### 2. Usuarios

**Tabla:** `usuarios`  
**Servicio:** `src/services/usuarios.service.ts`  
**Schema:** `src/schemas/user.schema.ts`  
**Tipos:** `src/types/usuarios.ts`  
**Página:** `src/app/(dashboard)/usuarios/page.tsx`

#### Campos de la tabla
| Campo | Tipo | Requerido | Notas |
|---|---|---|---|
| id | UUID | PK | = auth.users.id |
| email | TEXT | ✅ | único |
| nombre | TEXT | ❌ | |
| rol | TEXT | ✅ | SuperAdmin / AdminSede / Entrenador |
| sede_id | UUID | ❌ | FK → sedes |
| telefono | TEXT | ❌ | |
| foto_perfil | TEXT | ❌ | URL |
| created_at / updated_at | TIMESTAMPTZ | auto | |

#### Estado del servicio
| Operación | Función | Estado |
|---|---|---|
| Get All | `fetchUsuarios()` | ✅ |
| Get By ID | — | ❌ falta |
| Create | — | ❌ falta |
| Update | — | ❌ falta |
| Delete | — | ❌ falta |

#### Gaps identificados
- **Entidad más incompleta** — solo tiene lectura
- La creación de usuarios debe coordinarse con Supabase Auth (invite flow) y la función `sync_auth_profile`
- No existe UI para editar perfil de usuario (rol, sede, teléfono)
- No existe flujo de desactivación o eliminación de usuario
- El rol en `workspace_members` y el rol en `usuarios` son sistemas separados — hay riesgo de inconsistencia sin una capa de servicio que los sincronice

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
| Get All | `fetchEquiposForWorkspace(workspaceId)` | ✅ |
| Get By ID | — | ❌ falta |
| Create | `createEquipo(input)` | ✅ |
| Update | `updateEquipo(id, input)` | ✅ |
| Delete | `deleteEquipo(id)` | ✅ |
| Lookup | `fetchEquiposLookupBySedeIds(sedeIds)` | ✅ |

#### Gaps identificados
- No existe `getEquipoById`
- No existe endpoint para obtener **jugadores** de un equipo (no hay tabla `equipo_jugadores` ni `jugadores`)
- La entidad "jugador" no existe en el schema — gran gap de lógica de negocio

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
| Get By ID | — | ❌ falta |
| Create | `createSesion(input)` | ✅ |
| Update | `updateSesion(id, input)` | ✅ |
| Delete | `deleteSesion(id)` | ✅ |

#### Gaps identificados
- No existe `getSesionById`
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
| Get By ID | — | ❌ falta |
| Create | `createEjercicio(input)` | ✅ |
| Update | `updateEjercicio(id, input)` | ✅ |
| Delete | `deleteEjercicio(id)` | ✅ |

#### Gaps identificados
- No existe schema Zod para ejercicios
- No existe `getEjercicioById`
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
| Get By ID | — | ❌ falta |
| Create | `createDocumento(input)` | ✅ |
| Update | `updateDocumento(id, input)` | ✅ |
| Delete | `deleteDocumento(id)` | ✅ |

#### Gaps identificados
- No existe schema Zod para documentos
- No existe `getDocumentoById`
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
| Get All | — | ❌ falta |
| Get By ID | — | ❌ falta |
| Create | `createParametro(input)` | ✅ |
| Update | `updateParametro(id, input)` | ✅ |
| Delete | `deleteParametro(id)` | ✅ |

#### Gaps identificados
- No existe un `fetchAllParametros` — la lectura siempre requiere filtrar por categoría
- No existe schema Zod para parámetros
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

Estas entidades tienen relevancia para la lógica de negocio deportiva pero **no existen en absoluto** en el schema actual:

### Jugadores
La entidad más crítica que falta. Un equipo deportivo tiene jugadores. Actualmente no existe ninguna representación.

**Campos mínimos necesarios:**
```
jugadores
  id, nombre, apellido, fecha_nacimiento, posicion,
  dorsal, equipo_id, sede_id, workspace_id,
  foto_perfil, telefono, email, estado (activo/lesionado/baja),
  created_at, updated_at
```

**Operaciones necesarias:**
- CRUD completo
- Buscar por equipo
- Historial de equipos (tabla relacional `jugador_equipo`)
- Registro de lesiones

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
