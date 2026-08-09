"use client";

import { EconomiaPage } from "@/components/economia/EconomiaPage";
import { RequireRol } from "@/components/shared/RequireRol";

export default function EconomiaRoutePage() {
  return (
    <RequireRol recurso="economia">
      <EconomiaPage />
    </RequireRol>
  );
}
