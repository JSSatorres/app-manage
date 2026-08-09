import type { ReactNode } from "react";

/**
 * Contenedor estable para bloques de la landing.
 * Se mantiene la API para evitar saltos visuales causados por animaciones al entrar en viewport.
 */
export function Reveal({
  children,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  return <div className={className}>{children}</div>;
}
