"use client";

import { UsuariosListView } from "@/components/usuarios/UsuariosListView";
import { RequireRol } from "@/components/shared/RequireRol";

export default function UsuariosPage() {
  return (
    <RequireRol recurso="usuarios">
      <UsuariosListView />
    </RequireRol>
  );
}
