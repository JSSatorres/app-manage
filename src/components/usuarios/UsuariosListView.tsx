"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Button } from "@/components/ui/button";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can } from "@/lib/permisos";
import { InvitarUsuarioDialog } from "@/components/usuarios/InvitarUsuarioDialog";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";
import { MobileCardRow } from "@/components/shared/MobileCardRow";
import type { Usuario } from "@/types/usuarios";

const rolColors: Record<string, string> = {
  SuperAdmin: "bg-purple-100 text-purple-700",
  AdminSede: "bg-blue-100 text-blue-700",
  Entrenador: "bg-emerald-100 text-emerald-700",
  Jugador: "bg-amber-100 text-amber-700",
};

const rolLabels: Record<string, string> = {
  SuperAdmin: "Super Admin",
  AdminSede: "Admin de sede",
  Entrenador: "Entrenador",
  Jugador: "Jugador",
};

export function UsuariosListView() {
  const { data, loading, errorMessage, refetch } = useUsuarios();
  const { activeSede, rol } = useWorkspaceContext();
  const puedeMutar = can(rol, "usuarios", "mutate");
  const [dialogOpen, setDialogOpen] = useState(false);

  const columns = useMemo<Column<Usuario>[]>(() => {
    return [
      {
        key: "nombre",
        header: "Nombre",
        sortable: true,
        accessor: (r) => r.nombre ?? "",
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
        accessor: (r) => r.email,
      },
      {
        key: "rol",
        header: "Rol",
        sortable: true,
        accessor: (r) => r.rol,
        render: (r) => (
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full",
              rolColors[r.rol] ?? "bg-gray-100 text-gray-700",
            )}
          >
            {rolLabels[r.rol] ?? r.rol}
          </span>
        ),
      },
    ];
  }, []);

  return (
    <div>
      <PageHeader
        title="Usuarios"
        action={
          puedeMutar && activeSede ? (
            <Button type="button" onClick={() => setDialogOpen(true)}>
              Añadir usuario
            </Button>
          ) : undefined
        }
      />

      {errorMessage && (
        <p className="mb-4 text-sm text-destructive">{errorMessage}</p>
      )}

      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay usuarios"
        emptyDescription="Añade usuarios con el botón de arriba."
        mobileCard={(row) => (
          <MobileCardRow
            icon={User}
            title={row.nombre || row.email}
            meta={row.nombre ? row.email : undefined}
            showChevron={false}
            badge={
              <span
                className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  rolColors[row.rol] ?? "bg-gray-100 text-gray-700",
                )}
              >
                {rolLabels[row.rol] ?? row.rol}
              </span>
            }
          />
        )}
      />

      {activeSede && (
        <InvitarUsuarioDialog
          open={dialogOpen}
          sedeId={activeSede.id}
          onClose={() => setDialogOpen(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
