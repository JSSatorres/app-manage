"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PerfilForm } from "@/components/perfil/PerfilForm";
import { CambiarContrasenaForm } from "@/components/perfil/CambiarContrasenaForm";

export default function PerfilPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi perfil"
        description="Gestiona tu información personal y tu avatar"
      />
      <PerfilForm />
      <CambiarContrasenaForm />
    </div>
  );
}
