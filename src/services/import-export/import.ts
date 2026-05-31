import { fetchSedes, createSede } from "@/services/sedes.service";
import { fetchAllEquipos, createEquipo } from "@/services/equipos.service";
import { fetchAllEntrenadores, createEntrenador } from "@/services/entrenadores.service";
import { createJugador } from "@/services/jugadores.service";
import { createEjercicio } from "@/services/ejercicios.service";
import { createSesion } from "@/services/sesiones.service";
import type { PieDominante } from "@/types/jugadores";
import type { EstadoSesion, PeriodoTemporada } from "@/lib/constants";
import { normalizeHeader, IMPORT_ORDER, type EntityKey } from "./schema";
import { parseWorkbook, type ParsedRow } from "./workbook";

export interface EntityImportSummary {
  entity: EntityKey;
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export interface ImportResult {
  summaries: EntityImportSummary[];
  totalCreated: number;
  totalErrors: number;
}

/** Índice de nombres -> id, con búsqueda laxa (normalizada). */
class NameIndex {
  private map = new Map<string, string>();
  add(name: string | null | undefined, id: string) {
    if (!name) return;
    this.map.set(normalizeHeader(name), id);
  }
  get(name: string | null | undefined): string | undefined {
    if (!name) return undefined;
    return this.map.get(normalizeHeader(name));
  }
  has(name: string | null | undefined): boolean {
    return this.get(name) !== undefined;
  }
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function asNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (v == null || v === "") return [];
  return [String(v)];
}

function asBool(v: unknown): boolean {
  const s = v == null ? "" : normalizeHeader(String(v));
  return s === "si" || s === "sí" || s === "true" || s === "1" || s === "yes" || s === "x";
}

function normalizePie(v: unknown): PieDominante | null {
  const s = v == null ? "" : normalizeHeader(String(v));
  if (s.startsWith("zur") || s.startsWith("izq") || s === "left") return "Zurdo";
  if (s.startsWith("die") || s.startsWith("der") || s === "right") return "Diestro";
  if (s.startsWith("amb") || s === "both") return "Ambidiestro";
  return null;
}

function normalizeEstado(v: unknown): EstadoSesion {
  const s = v == null ? "" : normalizeHeader(String(v));
  if (s.includes("planific")) return "Planificada";
  if (s.includes("norealiz")) return "NoRealizada";
  if (s.includes("realiz")) return "Realizada";
  return "Borrador";
}

function normalizePeriodo(v: unknown): PeriodoTemporada | null {
  const s = v == null ? "" : normalizeHeader(String(v));
  if (s.startsWith("pre")) return "Pretemporada";
  if (s.startsWith("comp")) return "Competición";
  return null;
}

interface ImportContext {
  workspaceId: string;
  sedeIndex: NameIndex;
  equipoIndex: NameIndex;
  entrenadorIndex: NameIndex;
}

function fullName(nombre: string, apellidos: string | null): string {
  return [nombre, apellidos].filter(Boolean).join(" ");
}

async function importSedes(rows: ParsedRow[], ctx: ImportContext): Promise<EntityImportSummary> {
  const summary: EntityImportSummary = { entity: "sedes", created: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = asString(row.nombre);
    if (!nombre) {
      summary.errors.push({ row: i + 2, message: "Falta el nombre de la sede" });
      continue;
    }
    if (ctx.sedeIndex.has(nombre)) {
      summary.skipped++;
      continue;
    }
    const { data, error } = await createSede({
      nombre,
      direccion: asString(row.direccion),
      workspaceId: ctx.workspaceId,
    });
    if (error || !data) {
      summary.errors.push({ row: i + 2, message: error?.message ?? "Error al crear sede" });
      continue;
    }
    ctx.sedeIndex.add(data.nombre, data.id);
    summary.created++;
  }
  return summary;
}

async function importEquipos(rows: ParsedRow[], ctx: ImportContext): Promise<EntityImportSummary> {
  const summary: EntityImportSummary = { entity: "equipos", created: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = asString(row.nombre);
    if (!nombre) {
      summary.errors.push({ row: i + 2, message: "Falta el nombre del equipo" });
      continue;
    }
    if (ctx.equipoIndex.has(nombre)) {
      summary.skipped++;
      continue;
    }
    const sedeRef = asString(row.sede);
    const sedeId = ctx.sedeIndex.get(sedeRef);
    if (!sedeId) {
      summary.errors.push({ row: i + 2, message: `Sede no encontrada: "${sedeRef ?? ""}"` });
      continue;
    }
    const { data, error } = await createEquipo({
      nombre,
      categoria: asString(row.categoria),
      sedeId,
      workspaceId: ctx.workspaceId,
      entrenadorIds: [],
      jugadorIds: [],
    });
    if (error || !data) {
      summary.errors.push({ row: i + 2, message: error?.message ?? "Error al crear equipo" });
      continue;
    }
    ctx.equipoIndex.add(data.nombre, data.id);
    summary.created++;
  }
  return summary;
}

async function importEntrenadores(
  rows: ParsedRow[],
  ctx: ImportContext,
): Promise<EntityImportSummary> {
  const summary: EntityImportSummary = { entity: "entrenadores", created: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = asString(row.nombre);
    if (!nombre) {
      summary.errors.push({ row: i + 2, message: "Falta el nombre del entrenador" });
      continue;
    }
    const apellidos = asString(row.apellidos);
    if (ctx.entrenadorIndex.has(fullName(nombre, apellidos))) {
      summary.skipped++;
      continue;
    }
    const sedeIds = asList(row.sedes)
      .map((n) => ctx.sedeIndex.get(n))
      .filter((id): id is string => Boolean(id));
    const equipoIds = asList(row.equipos)
      .map((n) => ctx.equipoIndex.get(n))
      .filter((id): id is string => Boolean(id));
    const { data, error } = await createEntrenador({
      nombre,
      apellidos,
      email: asString(row.email),
      telefono: asString(row.telefono),
      fechaNacimiento: asString(row.fechaNacimiento),
      titulacion: asString(row.titulacion),
      notas: asString(row.notas),
      workspaceId: ctx.workspaceId,
      sedeIds,
      equipoIds,
    });
    if (error || !data) {
      summary.errors.push({ row: i + 2, message: error?.message ?? "Error al crear entrenador" });
      continue;
    }
    ctx.entrenadorIndex.add(fullName(data.nombre, data.apellidos), data.id);
    summary.created++;
  }
  return summary;
}

async function importJugadores(
  rows: ParsedRow[],
  ctx: ImportContext,
): Promise<EntityImportSummary> {
  const summary: EntityImportSummary = { entity: "jugadores", created: 0, skipped: 0, errors: [] };
  const seen = new NameIndex();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const nombre = asString(row.nombre);
    if (!nombre) {
      summary.errors.push({ row: i + 2, message: "Falta el nombre del jugador" });
      continue;
    }
    const apellidos = asString(row.apellidos);
    const key = fullName(nombre, apellidos);
    if (seen.has(key)) {
      summary.skipped++;
      continue;
    }
    const sedeIds = asList(row.sedes)
      .map((n) => ctx.sedeIndex.get(n))
      .filter((id): id is string => Boolean(id));
    const equipoIds = asList(row.equipos)
      .map((n) => ctx.equipoIndex.get(n))
      .filter((id): id is string => Boolean(id));
    const { data, error } = await createJugador({
      nombre,
      apellidos,
      email: asString(row.email),
      telefono: asString(row.telefono),
      fechaNacimiento: asString(row.fechaNacimiento),
      dorsal: asNumber(row.dorsal),
      posicion: asString(row.posicion),
      pieDominante: normalizePie(row.pieDominante),
      notas: asString(row.notas),
      tutorNombre: asString(row.tutorNombre),
      tutorTelefono: asString(row.tutorTelefono),
      workspaceId: ctx.workspaceId,
      sedeIds,
      equipoIds,
    });
    if (error || !data) {
      summary.errors.push({ row: i + 2, message: error?.message ?? "Error al crear jugador" });
      continue;
    }
    seen.add(key, data.id);
    summary.created++;
  }
  return summary;
}

async function importEjercicios(
  rows: ParsedRow[],
  ctx: ImportContext,
): Promise<EntityImportSummary> {
  const summary: EntityImportSummary = { entity: "ejercicios", created: 0, skipped: 0, errors: [] };
  const seen = new NameIndex();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const titulo = asString(row.titulo);
    if (!titulo) {
      summary.errors.push({ row: i + 2, message: "Falta el título del ejercicio" });
      continue;
    }
    if (seen.has(titulo)) {
      summary.skipped++;
      continue;
    }
    const sedePropietariaId = ctx.sedeIndex.get(asString(row.sede)) ?? null;
    const { data, error } = await createEjercicio({
      titulo,
      objetivoPrincipal: asString(row.objetivoPrincipal),
      numeroJugadoresMin: asNumber(row.numeroJugadoresMin),
      sedePropietariaId,
      esGlobal: asBool(row.esGlobal),
    });
    if (error || !data) {
      summary.errors.push({ row: i + 2, message: error?.message ?? "Error al crear ejercicio" });
      continue;
    }
    seen.add(titulo, data.id);
    summary.created++;
  }
  return summary;
}

async function importSesiones(
  rows: ParsedRow[],
  ctx: ImportContext,
): Promise<EntityImportSummary> {
  const summary: EntityImportSummary = { entity: "sesiones", created: 0, skipped: 0, errors: [] };
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const fecha = asString(row.fecha);
    if (!fecha) {
      summary.errors.push({ row: i + 2, message: "Falta la fecha de la sesión" });
      continue;
    }
    const equipoRef = asString(row.equipo);
    const equipoId = ctx.equipoIndex.get(equipoRef);
    if (!equipoId) {
      summary.errors.push({ row: i + 2, message: `Equipo no encontrado: "${equipoRef ?? ""}"` });
      continue;
    }
    const entrenadorRef = asString(row.entrenador);
    const entrenadorId = ctx.entrenadorIndex.get(entrenadorRef);
    if (!entrenadorId) {
      summary.errors.push({
        row: i + 2,
        message: `Entrenador no encontrado: "${entrenadorRef ?? ""}"`,
      });
      continue;
    }
    const { data, error } = await createSesion({
      fecha,
      horaInicio: asString(row.horaInicio),
      duracionEstimada: asNumber(row.duracionEstimada),
      equipoId,
      entrenadorIds: [entrenadorId],
      microciclo: asNumber(row.microciclo),
      periodoTemporada: normalizePeriodo(row.periodoTemporada),
      objetivoSesion: asString(row.objetivoSesion),
      observacionesPrevias: asString(row.observacionesPrevias),
      estado: normalizeEstado(row.estado),
    });
    if (error || !data) {
      summary.errors.push({ row: i + 2, message: error?.message ?? "Error al crear sesión" });
      continue;
    }
    summary.created++;
  }
  return summary;
}

/** Carga los índices nombre->id con lo que ya existe en BD para el workspace. */
async function loadExistingIndexes(workspaceId: string): Promise<ImportContext> {
  const ctx: ImportContext = {
    workspaceId,
    sedeIndex: new NameIndex(),
    equipoIndex: new NameIndex(),
    entrenadorIndex: new NameIndex(),
  };

  const [sedesRes, equiposRes, entrenadoresRes] = await Promise.all([
    fetchSedes(),
    fetchAllEquipos(),
    fetchAllEntrenadores(),
  ]);

  for (const s of sedesRes.data ?? []) {
    if (s.workspaceId === workspaceId) ctx.sedeIndex.add(s.nombre, s.id);
  }
  for (const e of equiposRes.data ?? []) {
    if (e.workspaceId == null || e.workspaceId === workspaceId) ctx.equipoIndex.add(e.nombre, e.id);
  }
  for (const e of entrenadoresRes.data ?? []) {
    if (e.workspaceId === workspaceId) {
      ctx.entrenadorIndex.add(fullName(e.nombre, e.apellidos), e.id);
    }
  }

  return ctx;
}

const IMPORTERS: Record<
  EntityKey,
  (rows: ParsedRow[], ctx: ImportContext) => Promise<EntityImportSummary>
> = {
  sedes: importSedes,
  equipos: importEquipos,
  entrenadores: importEntrenadores,
  jugadores: importJugadores,
  ejercicios: importEjercicios,
  sesiones: importSesiones,
};

/**
 * Importa un workbook completo para un workspace. Procesa las entidades en orden de
 * dependencia y resuelve las referencias por nombre (incluyendo las creadas en esta
 * misma importación). Idempotente por nombre: omite los duplicados.
 */
export async function importWorkbook(
  buffer: ArrayBuffer,
  workspaceId: string,
): Promise<ImportResult> {
  const parsed = parseWorkbook(buffer);
  const bySheet = new Map<EntityKey, ParsedRow[]>();
  for (const sheet of parsed) bySheet.set(sheet.entity, sheet.rows);

  const ctx = await loadExistingIndexes(workspaceId);
  const summaries: EntityImportSummary[] = [];

  for (const entity of IMPORT_ORDER) {
    const rows = bySheet.get(entity);
    if (!rows || rows.length === 0) continue;
    summaries.push(await IMPORTERS[entity](rows, ctx));
  }

  return {
    summaries,
    totalCreated: summaries.reduce((acc, s) => acc + s.created, 0),
    totalErrors: summaries.reduce((acc, s) => acc + s.errors.length, 0),
  };
}
