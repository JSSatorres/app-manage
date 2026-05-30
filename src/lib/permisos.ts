/**
 * Fuente única de verdad para los permisos por rol.
 *
 * El rol canónico viene de `workspace_members.role` (lo carga `useWorkspaceContext`).
 * Aquí se declara, en una sola matriz, qué puede VER y qué puede MUTAR (crear/editar/
 * borrar) cada rol sobre cada recurso. Tanto la navegación (sidebar/bottom-nav) como
 * el gating de acciones en las vistas consultan `can(...)`, evitando lógica de rol
 * dispersa por la app.
 */

export type Rol =
  | "superadmin"
  | "admin"
  | "gerente_sede"
  | "entrenador"
  | "jugador";

/** Recursos sobre los que se aplican permisos (coinciden con las secciones de la app). */
export type Recurso =
  | "dashboard"
  | "sedes"
  | "equipos"
  | "entrenadores"
  | "jugadores"
  | "ejercicios"
  | "sesiones"
  | "documentos"
  | "usuarios"
  | "parametros"
  | "configuracion";

export type Accion = "view" | "mutate";

const GESTORES: Rol[] = ["superadmin", "admin", "gerente_sede"];
const TODOS_GESTION: Rol[] = ["superadmin", "admin", "gerente_sede", "entrenador"];

/**
 * Matriz de permisos: para cada recurso, qué roles pueden `view` y qué roles pueden
 * `mutate`. `jugador` queda fuera del panel de gestión (gate en el layout), por eso no
 * aparece en ninguna lista.
 */
const PERMISOS: Record<Recurso, Record<Accion, Rol[]>> = {
  dashboard:     { view: TODOS_GESTION,                         mutate: GESTORES },
  sedes:         { view: GESTORES,                              mutate: ["superadmin", "admin", "gerente_sede"] },
  equipos:       { view: TODOS_GESTION,                         mutate: GESTORES },
  entrenadores:  { view: TODOS_GESTION,                         mutate: GESTORES },
  jugadores:     { view: TODOS_GESTION,                         mutate: TODOS_GESTION },
  ejercicios:    { view: TODOS_GESTION,                         mutate: TODOS_GESTION },
  sesiones:      { view: TODOS_GESTION,                         mutate: TODOS_GESTION },
  documentos:    { view: TODOS_GESTION,                         mutate: TODOS_GESTION },
  usuarios:      { view: GESTORES,                              mutate: ["superadmin", "admin"] },
  parametros:    { view: ["superadmin", "admin"],              mutate: ["superadmin", "admin"] },
  configuracion: { view: ["superadmin", "admin"],              mutate: ["superadmin", "admin"] },
};

/** ¿El rol puede realizar `accion` sobre `recurso`? */
export function can(rol: Rol | null | undefined, recurso: Recurso, accion: Accion): boolean {
  if (!rol) return false;
  return PERMISOS[recurso][accion].includes(rol);
}

/** Roles con acceso al panel de gestión (todos menos jugador). */
export function tieneAccesoAlPanel(rol: Rol | null | undefined): boolean {
  return rol != null && rol !== "jugador";
}

/** Normaliza un valor de rol arbitrario de la BD al tipo `Rol` (o null si no es válido). */
export function normalizeRol(value: string | null | undefined): Rol | null {
  switch (value) {
    case "superadmin":
    case "admin":
    case "gerente_sede":
    case "entrenador":
    case "jugador":
      return value;
    default:
      return null;
  }
}
