"use client";

import { InvitesSection } from "@/components/configuracion/InvitesSection";
import { DataExportImportSection } from "@/components/configuracion/DataExportImportSection";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Configuración" description="Configuración general" />
      <DataExportImportSection />
      <InvitesSection />
    </div>
  );
}
