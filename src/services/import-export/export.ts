import { fetchSedes } from "@/services/sedes.service";
import { fetchAllEquipos } from "@/services/equipos.service";
import { fetchAllEntrenadores } from "@/services/entrenadores.service";
import { fetchAllJugadores } from "@/services/jugadores.service";
import { fetchEjercicios } from "@/services/ejercicios.service";
import { fetchSesionesBySedeIds } from "@/services/sesiones.service";
import type { Sede } from "@/types/sedes";
import type { Equipo } from "@/types/equipos";
import type { Entrenador } from "@/types/entrenadores";
import type { Jugador } from "@/types/jugadores";
import type { Ejercicio } from "@/types/ejercicios";
import type { Sesion } from "@/types/sesiones";
import { buildWorkbookBlob } from "./workbook";
import type { EntityKey } from "./schema";

/**
 * Construye un workbook con todas las entidades del workspace activo. Las referencias
 * (sede, equipo, entrenador) se escriben por NOMBRE legible, no por UUID.
 */
export async function buildExportBlob(workspaceId: string): Promise<Blob> {
  const [sedesRes, equiposRes, entrenadoresRes, jugadoresRes] = await Promise.all([
    fetchSedes(),
    fetchAllEquipos(),
    fetchAllEntrenadores(),
    fetchAllJugadores(),
  ]);

  const sedes: Sede[] = (sedesRes.data ?? []).filter((s) => s.workspaceId === workspaceId);
  const equipos: Equipo[] = (equiposRes.data ?? []).filter(
    (e) => e.workspaceId == null || e.workspaceId === workspaceId,
  );
  const entrenadores: Entrenador[] = (entrenadoresRes.data ?? []).filter(
    (e) => e.workspaceId === workspaceId,
  );
  const jugadores: Jugador[] = (jugadoresRes.data ?? []).filter(
    (j) => j.workspaceId === workspaceId,
  );

  const sedeIds = sedes.map((s) => s.id);

  // Ejercicios: agregamos los de todas las sedes del workspace + globales, deduplicados.
  const ejerciciosPorSede = await Promise.all(sedeIds.map((id) => fetchEjercicios(id)));
  const ejerciciosMap = new Map<string, Ejercicio>();
  for (const res of ejerciciosPorSede) {
    for (const ej of res.data ?? []) ejerciciosMap.set(ej.id, ej);
  }
  const ejercicios = [...ejerciciosMap.values()];

  const sesionesRes = await fetchSesionesBySedeIds(sedeIds);
  const sesiones: Sesion[] = sesionesRes.data ?? [];

  // Índices id -> nombre para resolver referencias legibles
  const sedeName = new Map(sedes.map((s) => [s.id, s.nombre]));
  const equipoName = new Map(equipos.map((e) => [e.id, e.nombre]));
  const entrenadorName = new Map(
    entrenadores.map((e) => [e.id, [e.nombre, e.apellidos].filter(Boolean).join(" ")]),
  );

  const sheets: { entity: EntityKey; rows: Record<string, unknown>[] }[] = [
    {
      entity: "sedes",
      rows: sedes.map((s) => ({ nombre: s.nombre, direccion: s.direccion })),
    },
    {
      entity: "equipos",
      rows: equipos.map((e) => ({
        nombre: e.nombre,
        categoria: e.categoria,
        sede: sedeName.get(e.sedeId) ?? "",
      })),
    },
    {
      entity: "entrenadores",
      rows: entrenadores.map((e) => ({
        nombre: e.nombre,
        apellidos: e.apellidos,
        email: e.email,
        telefono: e.telefono,
        fechaNacimiento: e.fechaNacimiento,
        titulacion: e.titulacion,
        notas: e.notas,
        sedes: e.sedeIds.map((id) => sedeName.get(id)).filter(Boolean),
        equipos: e.equipoIds.map((id) => equipoName.get(id)).filter(Boolean),
      })),
    },
    {
      entity: "jugadores",
      rows: jugadores.map((j) => ({
        nombre: j.nombre,
        apellidos: j.apellidos,
        email: j.email,
        telefono: j.telefono,
        fechaNacimiento: j.fechaNacimiento,
        dorsal: j.dorsal,
        posicion: j.posicion,
        pieDominante: j.pieDominante,
        notas: j.notas,
        tutorNombre: j.tutorNombre,
        tutorTelefono: j.tutorTelefono,
        sedes: j.sedeIds.map((id) => sedeName.get(id)).filter(Boolean),
        equipos: j.equipoIds.map((id) => equipoName.get(id)).filter(Boolean),
      })),
    },
    {
      entity: "ejercicios",
      rows: ejercicios.map((ej) => ({
        titulo: ej.titulo,
        objetivoPrincipal: ej.objetivoPrincipal,
        numeroJugadoresMin: ej.numeroJugadoresMin,
        esGlobal: ej.esGlobal ? "Sí" : "No",
        sede: ej.sedePropietariaId ? (sedeName.get(ej.sedePropietariaId) ?? "") : "",
      })),
    },
    {
      entity: "sesiones",
      rows: sesiones.map((s) => ({
        fecha: s.fecha,
        horaInicio: s.horaInicio,
        duracionEstimada: s.duracionEstimada,
        equipo: equipoName.get(s.equipoId) ?? "",
        entrenador: s.entrenadorIds.map((id) => entrenadorName.get(id)).filter(Boolean).join(", "),
        microciclo: s.microciclo,
        periodoTemporada: s.periodoTemporada,
        objetivoSesion: s.objetivoSesion,
        observacionesPrevias: s.observacionesPrevias,
        estado: s.estado,
      })),
    },
  ];

  return buildWorkbookBlob(sheets);
}

/** Dispara la descarga de un Blob en el navegador. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
