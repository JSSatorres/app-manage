"use client";

import { InvitesSection } from "@/components/configuracion/InvitesSection";
import { DataExportImportSection } from "@/components/configuracion/DataExportImportSection";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequireRol } from "@/components/shared/RequireRol";

export default function ConfiguracionPage() {
  return (
    <RequireRol recurso="configuracion">
      <div className="space-y-8">
        <PageHeader title="Configuración" description="Configuración general" />
        <DataExportImportSection />
        <InvitesSection />
      </div>
    </RequireRol>
  );
}
