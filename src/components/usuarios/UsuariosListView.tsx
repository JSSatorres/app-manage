"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { useUsuarios } from "@/hooks/useUsuarios";
import { cn } from "@/lib/utils";
import type { Usuario } from "@/types/usuarios";

const rolColors: Record<string, string> = {
  SuperAdmin: "bg-purple-100 text-purple-700",
  AdminSede: "bg-blue-100 text-blue-700",
  Entrenador: "bg-emerald-100 text-emerald-700",
};

export function UsuariosListView() {
  const { data, loading, errorMessage } = useUsuarios();

  const columns = useMemo<Column<Usuario>[]>(() => {
    return [
      { key: "email", header: "Email", sortable: true, accessor: (r) => r.email },
      { key: "nombre", header: "Nombre", sortable: true, accessor: (r) => r.nombre ?? "" },
      {
        key: "rol",
        header: "Rol",
        sortable: true,
        accessor: (r) => r.rol,
        render: (r) => (
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", rolColors[r.rol] ?? "bg-gray-100 text-gray-700")}>
            {r.rol}
          </span>
        ),
      },
      { key: "sedeId", header: "SedeId", sortable: true, accessor: (r) => r.sedeId ?? "" },
    ];
  }, []);

  return (
    <div>
      <PageHeader title="Usuarios" description="Gestión de usuarios y roles (sin Auth todavía)" />
      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}
      <DataTable
        data={data ?? []}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay usuarios"
        emptyDescription="Se cargarán desde la tabla usuarios."
      />
    </div>
  );
}

