"use client";

import { InvitesSection } from "@/components/configuracion/InvitesSection";
import { PageHeader } from "@/components/shared/PageHeader";

export default function ConfiguracionPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Configuración" description="Configuración general" />
      <InvitesSection />
    </div>
  );
}
