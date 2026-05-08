export const ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN_SEDE: "AdminSede",
  ENTRENADOR: "Entrenador",
  JUGADOR: "Jugador",
} as const;

export type Rol = (typeof ROLES)[keyof typeof ROLES];

export const ESTADO_SESION = {
  BORRADOR: "Borrador",
  PLANIFICADA: "Planificada",
  REALIZADA: "Realizada",
} as const;

export type EstadoSesion = (typeof ESTADO_SESION)[keyof typeof ESTADO_SESION];

export const PERIODO_TEMPORADA = {
  PRETEMPORADA: "Pretemporada",
  COMPETICION: "Competición",
} as const;

export type PeriodoTemporada =
  (typeof PERIODO_TEMPORADA)[keyof typeof PERIODO_TEMPORADA];

export const CATEGORIAS_PARAMETRO = {
  TIPO_OBJETIVO: "tipo_objetivo",
  TIPO_CONTENIDO: "tipo_contenido",
  MATERIAL: "material",
  CATEGORIA_EDAD: "categoria_edad",
} as const;

export type CategoriaParametro =
  (typeof CATEGORIAS_PARAMETRO)[keyof typeof CATEGORIAS_PARAMETRO];
