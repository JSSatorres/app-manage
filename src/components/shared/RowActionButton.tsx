"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type RowActionTone = "primary" | "info" | "success" | "danger" | "neutral"

const TONE_CLASSES: Record<RowActionTone, string> = {
  primary: "bg-primary/8 text-primary hover:bg-primary/15 hover:text-primary",
  info: "bg-info/10 text-info hover:bg-info/15 hover:text-info",
  success: "bg-success/10 text-success hover:bg-success/15 hover:text-success",
  danger: "bg-destructive/8 text-destructive hover:bg-destructive/15 hover:text-destructive",
  neutral: "text-muted-foreground hover:bg-secondary hover:text-foreground",
}

interface RowActionButtonProps {
  /** Nombre accesible y tooltip (p. ej. «Editar»). */
  label: string
  icon: LucideIcon
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  /** Atajo de `tone="danger"`. */
  danger?: boolean
  /** Color del icono y de su tinte de fondo. Por defecto `primary` (o `danger`). */
  tone?: RowActionTone
  disabled?: boolean
}

/**
 * Acción de fila compacta (solo icono, con color semántico) para tablas densas.
 * El texto queda en `aria-label` y `title`, así que lectores de pantalla y tests
 * lo siguen viendo. Detiene la propagación para no abrir el detalle de la fila.
 */
export function RowActionButton({ label, icon: Icon, onClick, danger, tone, disabled }: RowActionButtonProps) {
  const resolvedTone: RowActionTone = tone ?? (danger ? "danger" : "primary")

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation()
        onClick(event)
      }}
      className={TONE_CLASSES[resolvedTone]}
    >
      <Icon className="size-4" />
    </Button>
  )
}

/** Contenedor alineado a la derecha para las acciones de una fila. */
export function RowActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex items-center justify-end gap-1", className)}>{children}</div>
}
