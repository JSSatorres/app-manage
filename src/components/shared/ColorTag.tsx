"use client"

import { colorForText } from "@/lib/sectionTones"
import { cn } from "@/lib/utils"

interface ColorTagProps {
  label: string
  /** Color explícito (CSS); si no se indica se deriva del texto. */
  color?: string
  className?: string
}

/**
 * Etiqueta con tinte de color estable por texto (misma categoría → mismo color).
 * El color acompaña al texto visible, nunca es el único portador de información.
 */
export function ColorTag({ label, color, className }: ColorTagProps) {
  const tagColor = color ?? colorForText(label.toLowerCase())

  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center gap-1.5 truncate rounded-md px-2 text-[11.5px] font-medium",
        className,
      )}
      style={{
        background: `color-mix(in srgb, ${tagColor} 12%, var(--card))`,
        color: `color-mix(in srgb, ${tagColor} 70%, var(--foreground))`,
      }}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: tagColor }} />
      <span className="truncate">{label}</span>
    </span>
  )
}
