"use client";

import { InvitesSection } from "@/components/configuracion/InvitesSection";
import { DataExportImportSection } from "@/components/configuracion/DataExportImportSection";
import { PageHeader } from "@/components/shared/PageHeader";
import { RequireRol } from "@/components/shared/RequireRol";
import { Settings2 } from "lucide-react";
import { sectionTones } from "@/lib/sectionTones";

export default function ConfiguracionPage() {
  return (
    <RequireRol recurso="configuracion">
      <div>
        <PageHeader
          title="Configuración"
          description="Configuración general"
          icon={Settings2}
          tone={sectionTones.configuracion}
        />
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <DataExportImportSection />
          <InvitesSection />
        </div>
      </div>
    </RequireRol>
  );
}
