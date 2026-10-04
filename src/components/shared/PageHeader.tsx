"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  /** Icono de la sección, mostrado en un mosaico de color junto al título. */
  icon?: LucideIcon
  /** Clases de tinte del mosaico (ver `sectionTones`). */
  tone?: string
  /** Información breve junto al título (contador, estado…). */
  meta?: React.ReactNode
}

export function PageHeader({ title, description, action, icon: Icon, tone, meta }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:mb-5">
      <div className="flex min-w-0 flex-[1_1_14rem] items-center gap-3">
        {Icon && (
          <span
            aria-hidden="true"
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ring-current/10",
              tone ?? "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-[21px] font-semibold leading-tight tracking-[-0.02em] text-foreground md:text-[23px]">
              {title}
            </h1>
            {meta}
          </div>
          {description && (
            <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}
