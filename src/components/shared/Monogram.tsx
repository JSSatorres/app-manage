"use client"

import { colorForText, initialsFor } from "@/lib/sectionTones"
import { cn } from "@/lib/utils"

interface MonogramProps {
  text: string
  className?: string
}

/** Avatar de iniciales con color estable derivado del texto. Decorativo. */
export function Monogram({ text, className }: MonogramProps) {
  const color = colorForText(text.toLowerCase())

  return (
    <span
      aria-hidden="true"
      className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-semibold", className)}
      style={{
        background: `color-mix(in srgb, ${color} 14%, var(--card))`,
        color: `color-mix(in srgb, ${color} 75%, var(--foreground))`,
      }}
    >
      {initialsFor(text)}
    </span>
  )
}

/** Celda de nombre con monograma + texto (y subtítulo opcional). */
export function NameCell({ name, subtitle }: { name: string; subtitle?: string | null }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Monogram text={name} />
      <span className="min-w-0">
        <span className="block truncate font-medium text-foreground">{name}</span>
        {subtitle ? <span className="block truncate text-[12px] font-normal text-muted-foreground">{subtitle}</span> : null}
      </span>
    </span>
  )
}
