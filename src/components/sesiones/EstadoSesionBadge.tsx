import { cn } from "@/lib/utils"

const ESTADO_TONES: Record<string, string> = {
  Planificada: "bg-info/10 text-info",
  Realizada: "bg-success/10 text-success",
  Borrador: "bg-secondary text-muted-foreground",
  NoRealizada: "bg-destructive/10 text-destructive",
}

export function estadoSesionLabel(estado: string): string {
  return estado === "NoRealizada" ? "No realizada" : estado
}

/** Color de acento (punto/borde) asociado a cada estado de sesión. */
export const ESTADO_SESION_DOT: Record<string, string> = {
  Planificada: "bg-info",
  Realizada: "bg-success",
  Borrador: "bg-muted-foreground/50",
  NoRealizada: "bg-destructive",
}

/** Estado de sesión con color semántico; el texto siempre acompaña al color. */
export function EstadoSesionBadge({ estado, className }: { estado: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-md px-2 text-[11.5px] font-semibold whitespace-nowrap",
        ESTADO_TONES[estado] ?? "bg-secondary text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", ESTADO_SESION_DOT[estado] ?? "bg-current")} />
      {estadoSesionLabel(estado)}
    </span>
  )
}
