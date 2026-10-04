"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
  icon?: LucideIcon
  /** Clases de tinte del icono (p. ej. `sectionTones.sesiones`). */
  tone?: string
  className?: string
  /** Etiqueta del encabezado; por defecto `p`. Usa `h2` cuando sea un título de sección. */
  labelAs?: "p" | "h2" | "h3"
  /** Contenido extra bajo el valor (mini gráfico, leyenda…). */
  children?: React.ReactNode
}

/** Tarjeta KPI compacta: icono de color + etiqueta + valor grande + pista. */
export function StatCard({ label, value, hint, icon: Icon, tone, className, labelAs: LabelTag = "p", children }: StatCardProps) {
  return (
    <article
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3 shadow-card md:p-4",
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={cn("grid size-8 shrink-0 place-items-center rounded-lg md:size-9", tone ?? "bg-primary/10 text-primary")}
        >
          <Icon className="size-[18px]" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <LabelTag className="truncate text-[12px] font-medium text-muted-foreground">{label}</LabelTag>
        <p className="mt-0.5 truncate text-[20px] font-semibold leading-tight tracking-[-0.02em] text-foreground tabular-nums md:text-[22px]">
          {value}
        </p>
        {hint && <p className="mt-0.5 hidden truncate text-[11.5px] text-muted-foreground sm:block">{hint}</p>}
        {children}
      </div>
    </article>
  )
}
