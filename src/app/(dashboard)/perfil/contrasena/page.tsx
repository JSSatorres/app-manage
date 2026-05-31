"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { CambiarContrasenaForm } from "@/components/perfil/CambiarContrasenaForm";

export default function CambiarContrasenaPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Cambiar contraseña"
        description="Actualiza la contraseña que usas para iniciar sesión"
      />
      <CambiarContrasenaForm />
    </div>
  );
}
