"use client";

import { ParametrosView } from "@/components/parametros/ParametrosView";
import { RequireRol } from "@/components/shared/RequireRol";

export default function ParametrosPage() {
  return (
    <RequireRol recurso="parametros">
      <ParametrosView />
    </RequireRol>
  );
}
