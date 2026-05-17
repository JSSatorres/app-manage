"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PerfilForm } from "@/components/perfil/PerfilForm";

export default function PerfilPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi perfil"
        description="Gestiona tu información personal y tu avatar"
      />
      <PerfilForm />
    </div>
  );
}
