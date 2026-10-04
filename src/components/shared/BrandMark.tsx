import { cn } from "@/lib/utils"

/**
 * Isotipo de SportApp: balón en movimiento. Usa `currentColor`, así que se colorea con `text-*`.
 * Los mismos trazos se rasterizan para el favicon y los iconos PWA en
 * `scripts/generate-brand-icons.mjs`: si cambias el dibujo, cámbialo en ambos sitios.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <circle cx="15" cy="12" r="7" />
      <path d="M10.4 6.9c2.5 2.8 2.5 7.4 0 10.2M19.6 6.9c-2.5 2.8-2.5 7.4 0 10.2" />
      <path d="M3 8.5h2.5M1.5 12h3.5M3 15.5h2.5" />
    </svg>
  )
}
