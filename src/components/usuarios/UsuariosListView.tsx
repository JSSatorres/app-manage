"use client";

import { useMemo } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { useUsuarios } from "@/hooks/useUsuarios";
import type { Usuario } from "@/types/usuarios";

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
        render: (r) => <Badge variant="secondary">{r.rol}</Badge>,
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

