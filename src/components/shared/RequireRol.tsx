"use client";

import { ShieldAlert } from "lucide-react";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can, type Recurso } from "@/lib/permisos";

/** Pantalla genérica de acceso denegado. */
export function AccesoDenegado({
  titulo = "No tienes acceso",
  descripcion = "Tu rol no tiene permisos para ver esta sección.",
}: {
  titulo?: string;
  descripcion?: string;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <ShieldAlert className="size-7 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{titulo}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>
    </div>
  );
}

/**
 * Envuelve contenido que solo deben ver los roles con permiso de vista sobre `recurso`.
 * Si el rol activo no puede verlo, muestra la pantalla de acceso denegado.
 */
export function RequireRol({
  recurso,
  children,
}: {
  recurso: Recurso;
  children: React.ReactNode;
}) {
  const { rol } = useWorkspaceContext();
  if (!can(rol, recurso, "view")) {
    return <AccesoDenegado />;
  }
  return <>{children}</>;
}
