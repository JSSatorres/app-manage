"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { PerfilForm } from "@/components/perfil/PerfilForm";
import { CambiarContrasenaForm } from "@/components/perfil/CambiarContrasenaForm";
import { UserRound } from "lucide-react";
import { sectionTones } from "@/lib/sectionTones";

export default function PerfilPage() {
  return (
    <div>
      <PageHeader
        title="Mi perfil"
        description="Gestiona tu información personal y tu avatar"
        icon={UserRound}
        tone={sectionTones.perfil}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <PerfilForm />
        <CambiarContrasenaForm />
      </div>
    </div>
  );
}
