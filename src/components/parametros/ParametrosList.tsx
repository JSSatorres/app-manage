"use client";

import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Pencil, Trash2, Settings2 } from "lucide-react";
import { RowActionButton, RowActions } from "@/components/shared/RowActionButton";
import type { ParametroSistema } from "@/types/parametros";
import { MobileCardRow } from "@/components/shared/MobileCardRow";

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
            <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-success/10 px-2 text-[11.5px] font-semibold text-success"><span aria-hidden="true" className="size-1.5 rounded-full bg-success" />Activo</span>
          ) : (
            <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-secondary px-2 text-[11.5px] font-medium text-muted-foreground"><span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/50" />Inactivo</span>
          ),
      },
      {
        key: "acciones",
        header: "Acciones",
        render: (row) => (
          <RowActions>
            <RowActionButton label="Editar" icon={Pencil} onClick={() => onEdit(row)} />
            <RowActionButton
              label={deletingId === row.id ? "Eliminando..." : "Eliminar"}
              icon={Trash2}
              danger
              disabled={deletingId === row.id}
              onClick={() => {
                setSelected(row);
                setConfirmOpen(true);
              }}
            />
          </RowActions>
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
        onRowClick={(row) => onEdit(row)}
        mobileCard={(row) => (
          <MobileCardRow
            icon={Settings2}
            iconColor="var(--chart-8)"
            title={row.nombre}
            badge={
              row.activo ? (
                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-success/10 px-2 text-[11.5px] font-semibold text-success"><span aria-hidden="true" className="size-1.5 rounded-full bg-success" />Activo</span>
              ) : (
                <span className="inline-flex h-[22px] items-center gap-1.5 rounded-md bg-secondary px-2 text-[11.5px] font-medium text-muted-foreground"><span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/50" />Inactivo</span>
              )
            }
          />
        )}
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

