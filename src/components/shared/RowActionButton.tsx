"use client"

import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RowActionButtonProps {
  /** Nombre accesible y tooltip (p. ej. «Editar»). */
  label: string
  icon: LucideIcon
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void
  danger?: boolean
  disabled?: boolean
}

/**
 * Acción de fila compacta (solo icono) para tablas densas. El texto queda en
 * `aria-label` y `title`, así que lectores de pantalla y tests lo siguen viendo.
 * Detiene la propagación para no abrir el detalle de la fila.
 */
export function RowActionButton({ label, icon: Icon, onClick, danger, disabled }: RowActionButtonProps) {
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
      className={cn(danger && "hover:bg-destructive/10 hover:text-destructive")}
    >
      <Icon className="size-4" />
    </Button>
  )
}

/** Contenedor alineado a la derecha para las acciones de una fila. */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>
}
