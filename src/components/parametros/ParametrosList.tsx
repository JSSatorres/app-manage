"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Pencil, Trash2 } from "lucide-react";
import type { ParametroSistema } from "@/types/parametros";

interface ParametrosListProps {
  data: ParametroSistema[];
  loading: boolean;
  onEdit: (row: ParametroSistema) => void;
  onDelete: (id: string) => Promise<void>;
  deletingId: string | null;
}

export function ParametrosList({
  data,
  loading,
  onEdit,
  onDelete,
  deletingId,
}: ParametrosListProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selected, setSelected] = useState<ParametroSistema | null>(null);

  const columns = useMemo<Column<ParametroSistema>[]>(() => {
    return [
      {
        key: "nombre",
        header: "Nombre",
        sortable: true,
        accessor: (r) => r.nombre,
      },
      {
        key: "activo",
        header: "Estado",
        sortable: true,
        accessor: (r) => (r.activo ? "Activo" : "Inactivo"),
        render: (row) =>
          row.activo ? (
            <Badge variant="secondary">Activo</Badge>
          ) : (
            <Badge variant="outline">Inactivo</Badge>
          ),
      },
      {
        key: "acciones",
        header: "Acciones",
        render: (row) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(row);
              }}
            >
              <Pencil className="mr-1 size-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelected(row);
                setConfirmOpen(true);
              }}
              disabled={deletingId === row.id}
            >
              <Trash2 className="mr-1 size-4" />
              {deletingId === row.id ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        ),
      },
    ];
  }, [onEdit, deletingId]);

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        loading={loading}
        rowKey={(r) => r.id}
        emptyTitle="No hay parámetros"
        emptyDescription="Crea el primer valor para esta categoría."
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar parámetro"
        description={`Se eliminará \"${selected?.nombre ?? ""}\". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={async () => {
          if (!selected) return;
          await onDelete(selected.id);
          setConfirmOpen(false);
          setSelected(null);
        }}
        loading={!!selected && deletingId === selected.id}
      />
    </>
  );
}

