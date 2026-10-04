/**
 * Color de acento por sección (tinte suave + texto). Se usa en el icono del
 * `PageHeader` y en los mosaicos del menú móvil para que cada módulo sea
 * reconocible de un vistazo y coherente entre escritorio y móvil.
 */
export const sectionTones = {
  dashboard: "bg-chart-1/12 text-chart-1",
  sesiones: "bg-chart-2/12 text-chart-2",
  ejercicios: "bg-chart-6/12 text-chart-6",
  documentos: "bg-chart-7/12 text-chart-7",
  sedes: "bg-chart-1/12 text-chart-1",
  equipos: "bg-chart-3/12 text-chart-3",
  entrenadores: "bg-chart-4/12 text-chart-4",
  jugadores: "bg-chart-5/12 text-chart-5",
  usuarios: "bg-chart-6/12 text-chart-6",
  economia: "bg-chart-3/12 text-chart-3",
  parametros: "bg-chart-8/12 text-chart-8",
  configuracion: "bg-secondary text-muted-foreground",
  perfil: "bg-chart-1/12 text-chart-1",
} as const

export type SectionKey = keyof typeof sectionTones

/** Paleta categórica para etiquetas y monogramas derivados de un texto. */
const TAG_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
] as const

/** Devuelve siempre el mismo color para el mismo texto (hash estable). */
export function colorForText(text: string): string {
  let hash = 0
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) | 0
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]!
}

/** Iniciales (máx. 2) para monogramas. */
export function initialsFor(text: string): string {
  const parts = text.trim().split(/[\s._-]+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}
