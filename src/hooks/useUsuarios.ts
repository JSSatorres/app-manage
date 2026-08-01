"use client";

import { useCallback, useMemo } from "react";
import { useMutation } from "@/hooks/useMutation";
import { useQuery } from "@/hooks/useQuery";
import {
  deleteUsuario,
  fetchUsuarios,
  updateUsuario,
  updateUsuarioRol,
} from "@/services/usuarios.service";
import { queryKeys } from "@/hooks/queryKeys";
import type { Usuario, UsuarioUpdateInput } from "@/types/usuarios";
import type { Rol } from "@/lib/permisos";

const INVALIDATE = { invalidateKeys: [queryKeys.usuarios.prefix] };

/**
 * CRUD de usuarios acotado al workspace activo. `usuarios` no tiene
 * `workspace_id` propio, así que toda mutación necesita `workspaceId` para
 * resolver la membresía en `workspace_members` (ver `usuarios.service.ts`).
 *
 * El alta de usuarios nuevos (Supabase Auth) sigue vía `InvitarUsuarioDialog` /
 * `crearInvitacion` (token + registro), no por este hook: crear una cuenta de
 * Auth requiere la admin API con `service_role`, que no puede vivir en el
 * cliente.
 */
export function useUsuarios(workspaceId: string | null) {
  const query = useQuery<Usuario[]>(
    () => (workspaceId ? fetchUsuarios(workspaceId) : Promise.resolve({ data: [], error: null })),
    queryKeys.usuarios.list(workspaceId),
  );

  const updateMutation = useMutation<Usuario, { id: string; input: UsuarioUpdateInput }>(
    ({ id, input }) => updateUsuario(id, workspaceId ?? "", input),
    INVALIDATE,
  );
  const updateRolMutation = useMutation<
    { workspaceId: string; userId: string; rol: string },
    { userId: string; rol: Rol }
  >(({ userId, rol }) => updateUsuarioRol(workspaceId ?? "", userId, rol), INVALIDATE);
  const deleteMutation = useMutation<boolean, { userId: string }>(
    ({ userId }) => deleteUsuario(workspaceId ?? "", userId),
    INVALIDATE,
  );

  const actions = useMemo(
    () => ({
      updateLoading: updateMutation.loading || updateRolMutation.loading,
      deleteLoading: deleteMutation.loading,
      updateErrorMessage: updateMutation.errorMessage ?? updateRolMutation.errorMessage,
      deleteErrorMessage: deleteMutation.errorMessage,
    }),
    [
      updateMutation.loading,
      updateRolMutation.loading,
      deleteMutation.loading,
      updateMutation.errorMessage,
      updateRolMutation.errorMessage,
      deleteMutation.errorMessage,
    ],
  );

  const updateOne = useCallback(
    async (id: string, input: UsuarioUpdateInput, rol: Rol) => {
      const updated = await updateMutation.mutate({ id, input });
      if (!updated) return null;
      const rolUpdated = await updateRolMutation.mutate({ userId: id, rol });
      if (!rolUpdated) return null;
      await query.refetch();
      return updated;
    },
    [updateMutation, updateRolMutation, query],
  );

  const deleteOne = useCallback(
    async (userId: string) => {
      const ok = await deleteMutation.mutate({ userId });
      if (ok) await query.refetch();
      return ok;
    },
    [deleteMutation, query],
  );

  return { ...query, ...actions, updateOne, deleteOne };
}
