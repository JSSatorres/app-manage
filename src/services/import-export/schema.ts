/**
 * Esquema canónico de columnas para importar/exportar entidades vía Excel.
 *
 * Cada campo declara una `key` canónica y una lista de `aliases`. Al leer una hoja,
 * los headers reales se normalizan (minúsculas, sin acentos, sin espacios ni signos)
 * y se comparan contra los alias, de modo que el usuario NO está obligado a nombrar
 * las columnas exactamente como en la base de datos.
 */

export type EntityKey =
  | "sedes"
  | "equipos"
  | "entrenadores"
  | "jugadores"
  | "ejercicios"
  | "sesiones";

export interface FieldSchema {
  /** Clave canónica del campo (la que usa el importador internamente). */
  key: string;
  /** Encabezado "bonito" que se escribe al exportar. */
  header: string;
  /** Alias aceptados al importar (se normalizan automáticamente). */
  aliases: string[];
  /** Tipo de dato para parsear el valor de la celda. */
  type: "string" | "number" | "date" | "time" | "list";
  /** Si es obligatorio para crear la entidad. */
  required?: boolean;
}

export interface EntitySchema {
  key: EntityKey;
  /** Nombre de la hoja en el workbook (al exportar). */
  sheet: string;
  /** Alias aceptados para identificar la hoja al importar. */
  sheetAliases: string[];
  fields: FieldSchema[];
}

/** Normaliza un texto para comparar headers / nombres de hoja de forma laxa. */
export function normalizeHeader(value: string): string {
  return (
    value
      .normalize("NFD")
      // Quitar marcas diacríticas combinantes (acentos). Se usa el escape \u
      // en vez del carácter literal porque el rango literal se corrompe bajo
      // el transform de Vitest, dejando los acentos sin quitar.
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
  ); // quitar espacios, signos, etc.
}

const SEDE_REF = ["sede", "sedes", "centro", "sedename", "nombresede"];
const EQUIPO_REF = ["equipo", "equipos", "team", "nombreequipo"];
const ENTRENADOR_REF = ["entrenador", "entrenadores", "coach", "tecnico"];

export const ENTITY_SCHEMAS: Record<EntityKey, EntitySchema> = {
  sedes: {
    key: "sedes",
    sheet: "Sedes",
    sheetAliases: ["sedes", "sede", "centros"],
    fields: [
      { key: "nombre", header: "Nombre", aliases: ["nombre", "name", "nombresede"], type: "string", required: true },
      { key: "direccion", header: "Dirección", aliases: ["direccion", "address", "ubicacion"], type: "string" },
    ],
  },
  equipos: {
    key: "equipos",
    sheet: "Equipos",
    sheetAliases: ["equipos", "equipo", "teams"],
    fields: [
      { key: "nombre", header: "Nombre", aliases: ["nombre", "name", "nombreequipo"], type: "string", required: true },
      { key: "categoria", header: "Categoría", aliases: ["categoria", "category", "cat"], type: "string" },
      { key: "sede", header: "Sede", aliases: SEDE_REF, type: "string", required: true },
    ],
  },
  entrenadores: {
    key: "entrenadores",
    sheet: "Entrenadores",
    sheetAliases: ["entrenadores", "entrenador", "coaches", "tecnicos"],
    fields: [
      { key: "nombre", header: "Nombre", aliases: ["nombre", "name", "firstname"], type: "string", required: true },
      { key: "apellidos", header: "Apellidos", aliases: ["apellidos", "apellido", "lastname", "surname"], type: "string" },
      { key: "email", header: "Email", aliases: ["email", "correo", "mail", "correoelectronico"], type: "string" },
      { key: "telefono", header: "Teléfono", aliases: ["telefono", "phone", "movil", "celular", "tel"], type: "string" },
      { key: "fechaNacimiento", header: "Fecha nacimiento", aliases: ["fechanacimiento", "nacimiento", "birthdate", "fechadenacimiento"], type: "date" },
      { key: "titulacion", header: "Titulación", aliases: ["titulacion", "titulo", "licencia", "qualification"], type: "string" },
      { key: "notas", header: "Notas", aliases: ["notas", "observaciones", "notes", "comentarios"], type: "string" },
      { key: "sedes", header: "Sedes", aliases: ["sedes", "sede", "centros"], type: "list" },
      { key: "equipos", header: "Equipos", aliases: ["equipos", "equipo", "teams"], type: "list" },
    ],
  },
  jugadores: {
    key: "jugadores",
    sheet: "Jugadores",
    sheetAliases: ["jugadores", "jugador", "players"],
    fields: [
      { key: "nombre", header: "Nombre", aliases: ["nombre", "name", "firstname"], type: "string", required: true },
      { key: "apellidos", header: "Apellidos", aliases: ["apellidos", "apellido", "lastname", "surname"], type: "string" },
      { key: "email", header: "Email", aliases: ["email", "correo", "mail", "correoelectronico"], type: "string" },
      { key: "telefono", header: "Teléfono", aliases: ["telefono", "phone", "movil", "celular", "tel"], type: "string" },
      { key: "fechaNacimiento", header: "Fecha nacimiento", aliases: ["fechanacimiento", "nacimiento", "birthdate", "fechadenacimiento"], type: "date" },
      { key: "dorsal", header: "Dorsal", aliases: ["dorsal", "numero", "number", "num"], type: "number" },
      { key: "posicion", header: "Posición", aliases: ["posicion", "position", "pos", "demarcacion"], type: "string" },
      { key: "pieDominante", header: "Pie dominante", aliases: ["piedominante", "pie", "foot", "dominantfoot"], type: "string" },
      { key: "notas", header: "Notas", aliases: ["notas", "observaciones", "notes", "comentarios"], type: "string" },
      { key: "tutorNombre", header: "Tutor (nombre)", aliases: ["tutornombre", "tutor", "nombretutor", "guardian"], type: "string" },
      { key: "tutorTelefono", header: "Tutor (teléfono)", aliases: ["tutortelefono", "telefonotutor", "telefonodeltutor"], type: "string" },
      { key: "sedes", header: "Sedes", aliases: ["sedes", "sede", "centros"], type: "list" },
      { key: "equipos", header: "Equipos", aliases: ["equipos", "equipo", "teams"], type: "list" },
    ],
  },
  ejercicios: {
    key: "ejercicios",
    sheet: "Ejercicios",
    sheetAliases: ["ejercicios", "ejercicio", "exercises", "drills"],
    fields: [
      { key: "titulo", header: "Título", aliases: ["titulo", "nombre", "name", "title"], type: "string", required: true },
      { key: "objetivoPrincipal", header: "Objetivo principal", aliases: ["objetivoprincipal", "objetivo", "objective", "goal", "finalidad"], type: "string" },
      { key: "numeroJugadoresMin", header: "Nº jugadores mínimo", aliases: ["numerojugadoresmin", "numjugadores", "jugadoresmin", "minjugadores", "numerojugadores"], type: "number" },
      { key: "esGlobal", header: "Global", aliases: ["global", "esglobal", "comun", "compartido"], type: "string" },
      { key: "sede", header: "Sede", aliases: SEDE_REF, type: "string" },
    ],
  },
  sesiones: {
    key: "sesiones",
    sheet: "Sesiones",
    sheetAliases: ["sesiones", "sesion", "sessions", "entrenamientos"],
    fields: [
      { key: "fecha", header: "Fecha", aliases: ["fecha", "date", "dia"], type: "date", required: true },
      { key: "horaInicio", header: "Hora inicio", aliases: ["horainicio", "hora", "time", "starttime"], type: "time" },
      { key: "duracionEstimada", header: "Duración (min)", aliases: ["duracionestimada", "duracion", "duration", "minutos"], type: "number" },
      { key: "equipo", header: "Equipo", aliases: EQUIPO_REF, type: "string", required: true },
      { key: "entrenador", header: "Entrenador", aliases: ENTRENADOR_REF, type: "string" },
      { key: "microciclo", header: "Microciclo", aliases: ["microciclo", "microcycle", "ciclo"], type: "number" },
      { key: "periodoTemporada", header: "Periodo temporada", aliases: ["periodotemporada", "periodo", "fase", "period"], type: "string" },
      { key: "objetivoSesion", header: "Objetivo", aliases: ["objetivosesion", "objetivo", "objective", "goal"], type: "string" },
      { key: "observacionesPrevias", header: "Observaciones", aliases: ["observacionesprevias", "observaciones", "notas", "notes"], type: "string" },
      { key: "estado", header: "Estado", aliases: ["estado", "status", "state"], type: "string" },
    ],
  },
};

/** Orden de procesamiento al importar (respeta dependencias por referencia). */
export const IMPORT_ORDER: EntityKey[] = [
  "sedes",
  "equipos",
  "entrenadores",
  "jugadores",
  "ejercicios",
  "sesiones",
];

/**
 * Construye un mapa header-normalizado -> fieldKey para una entidad, a partir de
 * los headers reales presentes en la hoja.
 */
export function buildHeaderMap(
  schema: EntitySchema,
  realHeaders: string[],
): Map<number, string> {
  const aliasToKey = new Map<string, string>();
  for (const field of schema.fields) {
    aliasToKey.set(normalizeHeader(field.key), field.key);
    aliasToKey.set(normalizeHeader(field.header), field.key);
    for (const alias of field.aliases) aliasToKey.set(normalizeHeader(alias), field.key);
  }

  const columnIndexToKey = new Map<number, string>();
  realHeaders.forEach((header, index) => {
    if (header == null) return;
    const key = aliasToKey.get(normalizeHeader(String(header)));
    if (key) columnIndexToKey.set(index, key);
  });
  return columnIndexToKey;
}