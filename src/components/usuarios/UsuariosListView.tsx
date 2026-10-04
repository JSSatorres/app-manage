"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useUsuarios } from "@/hooks/useUsuarios";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/lib/workspaceContext";
import { can } from "@/lib/permisos";
import { InvitarUsuarioDialog } from "@/components/usuarios/InvitarUsuarioDialog";
import { UsuarioForm } from "@/components/usuarios/UsuarioForm";
import { cn } from "@/lib/utils";
import { User, Users, Pencil, UserMinus } from "lucide-react";
import { NameCell } from "@/components/shared/Monogram";
import { RowActionButton, RowActions } from "@/components/shared/RowActionButton";
import { sectionTones } from "@/lib/sectionTones";
import { MobileCardRow } from "@/components/shared/MobileCardRow";
import type { Usuario } from "@/types/usuarios";
import type { EditUsuarioValues } from "@/schemas/usuario.schema";

const ROL_COLORS: Record<string, string> = {
  superadmin: "bg-chart-6/12 text-chart-6",
  admin: "bg-primary/10 text-primary",
  gerente_sede: "bg-chart-2/12 text-info",
  entrenador: "bg-chart-4/15 text-warning",
  jugador: "bg-chart-3/12 text-success",
};

const ROL_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Admin de sede",
  gerente_sede: "Gerente de sede",
  entrenador: "Entrenador",
  jugador: "Jugador",
};

export function UsuariosListView() {
  const { activeWorkspaceId, activeSede, rol } = useWorkspaceContext();
  const { user: currentUser } = useAuth();
  const { data, loading, errorMessage, refetch, updateOne, deleteOne, updateLoading, updateErrorMessage } =
    useUsuarios(activeWorkspaceId);
  const puedeMutar = can(rol, "usuarios", "mutate");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState<Usuario | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  const columns = useMemo<Column<Usuario>[]>(() => {
    const cols: Column<Usuario>[] = [
      {
        key: "nombre",
        header: "Nombre",
        sortable: true,
        accessor: (r) => r.nombre ?? "",
        render: (r) => <NameCell name={r.nombre || r.email} />,
      },
      {
        key: "email",
        header: "Email",
        sortable: true,
        accessor: (r) => r.email,
        className: "text-muted-foreground",
      },
      {
        key: "rol",
        header: "Rol",
        sortable: true,
        accessor: (r) => r.workspaceRol,
        render: (r) => (
          <span
            className={cn(
              "inline-flex h-[22px] items-center rounded-md px-2 text-[11.5px] font-semibold",
              ROL_COLORS[r.workspaceRol] ?? "bg-secondary text-foreground",
            )}
          >
            {ROL_LABELS[r.workspaceRol] ?? r.workspaceRol}
          </span>
        ),
      },
    ];

    if (puedeMutar) {
      cols.push({
        key: "acciones",
        header: "Acciones",
        render: (row) => (
          <RowActions>
            <RowActionButton
              label="Editar"
              icon={Pencil}
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
            />
            {row.id !== currentUser?.id && (
              <RowActionButton
                label="Quitar"
                icon={UserMinus}
                danger
                onClick={() => {
                  setDeleting(row);
                  setConfirmOpen(true);
                }}
              />
            )}
          </RowActions>
        ),
      });
    }

    return cols;
  }, [puedeMutar, currentUser?.id]);

  return (
    <div>
      <PageHeader
        title="Usuarios"
        icon={Users}
        tone={sectionTones.usuarios}
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
        onRowClick={puedeMutar ? (row) => {
          setEditing(row);
          setFormOpen(true);
        } : undefined}
        mobileCard={(row) => (
          <MobileCardRow
            icon={User}
            title={row.nombre || row.email}
            meta={row.nombre ? row.email : undefined}
            showChevron={puedeMutar}
            badge={
              <span
                className={cn(
                  "inline-flex h-[22px] items-center rounded-md px-2 text-[11.5px] font-semibold",
                  ROL_COLORS[row.workspaceRol] ?? "bg-secondary text-foreground",
                )}
              >
                {ROL_LABELS[row.workspaceRol] ?? row.workspaceRol}
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

      <UsuarioForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        usuario={editing}
        loading={updateLoading}
        errorMessage={updateErrorMessage}
        onSubmit={async (value: EditUsuarioValues) => {
          if (!editing) return;
          const updated = await updateOne(
            editing.id,
            { nombre: value.nombre, telefono: value.telefono || null },
            value.rol,
          );
          if (updated) {
            setFormOpen(false);
            setEditing(null);
          }
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Quitar usuario del workspace"
        description={`"${deleting?.nombre ?? deleting?.email ?? ""}" perderá el acceso a este workspace. Su cuenta y su acceso a otros workspaces no se ven afectados.`}
        confirmLabel="Quitar"
        variant="destructive"
        loading={deletingLoading}
        onConfirm={async () => {
          if (!deleting) return;
          setDeletingLoading(true);
          await deleteOne(deleting.id);
          setDeletingLoading(false);
          setConfirmOpen(false);
          setDeleting(null);
        }}
      />
    </div>
  );
}
