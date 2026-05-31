# Next Features — Auditoría de rutas y CRUD

> Auditoría manual ejecutada con `agent-browser` sobre `http://localhost:3000` el 2026-05-08.
> Usuario de prueba: `TEST_USER_EMAIL` (rol detectado: **no es workspace admin** — algunas secciones quedaron ocultas).
>
> **Convenciones**
> - ✅ funciona | ❌ no funciona | ⚠️ funciona con observaciones | 🚧 no implementado
> - **CRUD esperado** = Create / Read (list + detail) / Update / Delete
> - "Endpoints" en este proyecto = funciones de servicio en `src/services/*.service.ts` (no hay rutas `/api`; se usa Supabase desde el cliente).

---

## Resumen ejecutivo

- Todas las rutas del dashboard cargan correctamente y la sesión se mantiene tras login con email+password.
- El CRUD de UI está completo en: **Sedes, Ejercicios, Sesiones, Documentos, Parámetros**.
- **Equipos**: el servicio expone CRUD completo, la UI también, pero la lista cargó vacía (puede ser dato + filtro por sede, no se ha podido probar editar/eliminar en vivo).
- **Usuarios**: ❌ falta UI de **edición y borrado por fila**. El servicio `usuarios.service.ts` solo expone `fetchUsuarios()`; no hay `updateUsuario`/`deleteUsuario`/`updateRol`. La única forma de añadir es vía invitación.
- **Configuración**: la página solo monta `InvitesSection`, que está condicionada a `isWorkspaceAdmin && activeSede`. Con el usuario de prueba no aparece nada → la página queda vacía. ⚠️ Hace falta o un placeholder o más contenido (preferencias, datos del workspace, etc.).
- Ninguna entidad expone **detalle individual** (no hay rutas `/{entidad}/[id]` ni servicios `fetchById`). Click en filas no navega a detalle.
- No existen rutas `/api/**` (todo es client → Supabase). Si en algún momento se necesita server actions / route handlers, está sin cubrir.

---

## Rutas auditadas

### Auth / públicas

| Ruta | Estado | Notas |
|------|--------|-------|
| `/login` | ✅ | Form email + password renderiza; botón "Entrar" se habilita al rellenar; login real OK redirige a `/dashboard`. |
| `/register` | ✅ | Render correcto: email, password, confirm password, "Crear cuenta", "Continuar con Google", link a iniciar sesión. No probado a fondo (no se crea cuenta para no ensuciar BD). |
| `/join` | ⚠️ | Estando logueado redirige a `/dashboard` (comportamiento esperado, pero no se ha podido probar el flujo de aceptar invitación con un token). Sería útil un test E2E con token válido. |
| `/auth/callback` | _no probado_ | Solo se usa como destino de OAuth. No se navega manualmente. |
| `/~offline` | ✅ | Renderiza heading "Sin conexión". |

### Dashboard (protegido)

| Ruta | Estado | Acciones probadas |
|------|--------|-------------------|
| `/dashboard` | ✅ | Renderiza "Panel de rendimiento", "Sesiones recientes", "Resumen rápido", botón Exportar. No probada la exportación. |
| `/sedes` | ✅ | Lista con 9 sedes, botón "Nueva" abre dialog (`Nombre`, `Dirección`), por fila hay "Editar"/"Eliminar". Filas marcadas `clickable` pero **no navegan a detalle** (no hay ruta `/sedes/[id]`). |
| `/equipos` | ⚠️ | Lista vacía ("No hay equipos") — probablemente filtrada por sede activa o no hay datos. Botón "Nuevo" abre dialog (`Nombre`, `Categoría`, combo `Sede`). No se pudo probar editar/eliminar por falta de filas. |
| `/usuarios` | ⚠️ | Lista 10+ usuarios, paginación funciona. Botón "Añadir usuario" abre dialog de **invitación** (email + rol). **No hay botones de editar/eliminar por fila**. Click en row no abre detalle ni edit. |
| `/ejercicios` | ✅ | Lista con 4 ejercicios, columna Global, "Editar"/"Eliminar" por fila, botón "Nuevo" abre dialog (`Título`, `Objetivo principal`, `Nº jugadores mín.`, switch global, combo `Sede`). |
| `/sesiones` | ⚠️ | Lista vacía ("No hay sesiones"). Botón "Nueva" abre dialog completo (fecha, hora, duración, microciclo, equipo, entrenador, periodo, estado, objetivo, observaciones). No se pudo probar editar/eliminar. |
| `/documentos` | ⚠️ | Lista vacía ("No hay documentos"). Botón "Nuevo" abre dialog (`Título`, `Categoría`, `Drive file id`, combo Sede). No se pudo probar editar/eliminar. |
| `/parametros` | ✅ | 4 tabs: **Tipo objetivo** (8 filas), **Tipo contenido** (3), **Material** y **Categoría edad** (no inspeccionadas a fondo). Cada tab tiene su tabla con CRUD UI completo. Botón "Nuevo" global. |
| `/configuracion` | ⚠️ | Solo renderiza `<PageHeader>` + `<InvitesSection>`. Como `InvitesSection` requiere `isWorkspaceAdmin && activeSede`, con el usuario de prueba la página queda **prácticamente vacía**. Hace falta contenido o mensaje. |

---

## Detalle por entidad — endpoints actuales y huecos

CRUD esperado para una entidad de gestión: **list, getById, create, update, delete** (+ a veces toggleActive, search, paginate server-side).

### `sedes` ([src/services/sedes.service.ts](src/services/sedes.service.ts))

Existe: `fetchSedes`, `createSede`, `updateSede`, `deleteSede`, `fetchSedesLookup`.

Faltantes:
- 🚧 `fetchSedeById(id)` — no hay endpoint de detalle (la UI tampoco lo necesita por ahora, pero si aparece una página `/sedes/[id]` lo necesitará).
- 🚧 No hay borrado lógico / `is_active` (sede solo se borra duro).

### `equipos` ([src/services/equipos.service.ts](src/services/equipos.service.ts))

Existe: `fetchEquipos(sedeId)`, `fetchAllEquipos`, `createEquipo`, `updateEquipo`, `deleteEquipo`, `fetchEquiposLookupBySedeIds`.

Faltantes:
- 🚧 `fetchEquipoById(id)` para detalle.
- ⚠️ No hay endpoint de "miembros del equipo" (jugadores/entrenadores asociados). Si la app va a gestionar plantilla, falta `addMember`, `removeMember`, `listMembers`.

### `usuarios` ([src/services/usuarios.service.ts](src/services/usuarios.service.ts))

Existe: `fetchUsuarios`, `fetchUsuariosLookup`.

Faltantes (**huecos importantes**):
- 🚧 `fetchUsuarioById(id)`
- 🚧 `updateUsuario(id, input)` — no se puede cambiar nombre/datos del usuario.
- 🚧 `updateUsuarioRol(id, rol, sedeId)` — cambiar rol dentro de una sede.
- 🚧 `deleteUsuario(id)` o `removeUsuarioFromSede(usuarioId, sedeId)`.
- 🚧 La UI no expone Editar/Eliminar por fila.
- ⚠️ Solo se puede *añadir* mediante `invitaciones.service.ts::crearInvitacion`. Falta también `revokeInvitacion`, `listInvitacionesPendientes`.

### `ejercicios` ([src/services/ejercicios.service.ts](src/services/ejercicios.service.ts))

Existe: `fetchEjercicios(sedeId)`, `createEjercicio`, `updateEjercicio`, `deleteEjercicio`.

Faltantes:
- 🚧 `fetchEjercicioById(id)` para detalle (la UI muestra título/objetivo/global pero no detalle).
- 🚧 `fetchEjerciciosGlobales()` separado, o filtros por `objetivo`/`categoría`.
- ⚠️ No hay un `fetchAllEjercicios` (solo por `sedeId`). Si el usuario super-admin quiere ver todos, hace falta uno como en `equipos`.

### `sesiones` ([src/services/sesiones.service.ts](src/services/sesiones.service.ts))

Existe: `fetchSesionesBySedeIds`, `createSesion`, `updateSesion`, `deleteSesion`.

Faltantes:
- 🚧 `fetchSesionById(id)` — necesario para ver/editar bloques de la sesión, ejercicios asignados, etc.
- 🚧 No se ven endpoints para gestionar **bloques/ejercicios dentro de una sesión** (lo típico: `addEjercicioToSesion`, `removeEjercicioFromSesion`, `reorderBloques`). Si la sesión tiene contenido detallado, falta toda la capa.
- 🚧 Filtros por equipo / entrenador / fecha / estado a nivel servicio (parece que se filtra solo por `sedeIds`).
- 🚧 `duplicateSesion(id)` — útil para copiar una plantilla.

### `documentos` ([src/services/documentos.service.ts](src/services/documentos.service.ts))

Existe: `fetchDocumentosBySedeIds`, `createDocumento`, `updateDocumento`, `deleteDocumento`.

Faltantes:
- 🚧 `fetchDocumentoById(id)`.
- 🚧 Integración con Drive (`driveAdapter.ts` existe) pero no hay endpoint para subir archivo y obtener `drive_file_id` automáticamente — el dialog pide pegar el ID a mano. UX mejorable.
- 🚧 Filtro por categoría / búsqueda en backend.

### `parametros` ([src/services/parametros.service.ts](src/services/parametros.service.ts))

Existe: `fetchParametrosByCategoria`, `createParametro`, `updateParametro`, `deleteParametro`.

Faltantes:
- 🚧 `fetchParametroById(id)`.
- 🚧 `toggleActivoParametro(id)` (la UI muestra "Activo" como columna pero el toggle se hace via update — OK, no es crítico).
- 🚧 `reorderParametros(...)` si se quiere ordenar manualmente las opciones.

### `invitaciones` ([src/services/invitaciones.service.ts](src/services/invitaciones.service.ts))

Existe: `crearInvitacion`.

Faltantes:
- 🚧 `listInvitaciones(sedeId)` — para ver pendientes.
- 🚧 `revokeInvitacion(id)`.
- 🚧 `resendInvitacion(id)`.
- 🚧 `acceptInvitacion(token)` (probablemente exista lógica, pero no como función exportada del servicio).

---

## Errores observados

Ninguno de runtime durante la exploración. Caveats:

- `agent-browser wait --url` falló intermitentemente con error de conexión (parece un bug del wait sobre dev server con Turbopack), pero la navegación sí ocurrió correctamente y la URL final era la esperada. No es bug de la app.
- En `/login`, los `fill`/`type` por CDP **no disparan** el `onChange` de los `<Input>` controlados por React. Hubo que usar el setter nativo (`HTMLInputElement.prototype.value`) + `dispatchEvent('input')`. Es relevante para futuros tests automatizados: usar Playwright con `locator.fill()` (que sí lo hace bien) o el truco del native setter.

---

## Recomendaciones priorizadas

1. **Usuarios**: añadir UI + servicios de `update`, `updateRol`, `delete/removeFromSede`. Es el hueco más visible.
2. **Configuración**: dar contenido alternativo cuando no eres workspace admin (preferencias del usuario, idioma, etc.) o al menos un mensaje "Sin opciones disponibles para tu rol".
3. **Detalle por entidad**: si la app va a crecer, ir añadiendo `/{entidad}/[id]/page.tsx` y `fetch...ById` en cada servicio. Las filas ya están marcadas como clickable.
4. **Invitaciones**: panel de invitaciones pendientes con revocar/reenviar.
5. **Sesiones**: confirmar si las sesiones tienen contenido detallado (bloques/ejercicios). Si sí, falta toda la capa de gestión.
6. **Documentos**: subida directa a Drive desde el dialog en vez de pegar `drive_file_id`.
