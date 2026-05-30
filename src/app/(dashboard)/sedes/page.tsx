"use client";

import { SedesListView } from "@/components/sedes/SedesListView";
import { RequireRol } from "@/components/shared/RequireRol";

export default function SedesPage() {
  return (
    <RequireRol recurso="sedes">
      <SedesListView />
    </RequireRol>
  );
}
