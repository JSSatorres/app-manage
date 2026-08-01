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
import { User, Pencil, UserMinus } from "lucide-react";
import { MobileCardRow } from "@/components/shared/MobileCardRow";
import type { Usuario } from "@/types/usuarios";
import type { EditUsuarioValues } from "@/schemas/usuario.schema";

const ROL_COLORS: Record<string, string> = {
  superadmin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  gerente_sede: "bg-cyan-100 text-cyan-700",
  entrenador: "bg-emerald-100 text-emerald-700",
  jugador: "bg-amber-100 text-amber-700",
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
        accessor: (r) => r.workspaceRol,
        render: (r) => (
          <span
            className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full",
              ROL_COLORS[r.workspaceRol] ?? "bg-gray-100 text-gray-700",
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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row);
                setFormOpen(true);
              }}
            >
              <Pencil className="mr-1 size-4" />
              Editar
            </Button>
            {row.id !== currentUser?.id && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleting(row);
                  setConfirmOpen(true);
                }}
              >
                <UserMinus className="mr-1 size-4" />
                Quitar
              </Button>
            )}
          </div>
        ),
      });
    }

    return cols;
  }, [puedeMutar, currentUser?.id]);

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
                  "text-[11px] font-semibold px-2 py-0.5 rounded-full",
                  ROL_COLORS[row.workspaceRol] ?? "bg-gray-100 text-gray-700",
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
