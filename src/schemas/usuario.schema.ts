import { z } from "zod";

/**
 * Roles asignables desde el formulario de edición de usuarios
 * (`workspace_members.role`, el rol canónico — no el legacy `usuarios.rol`).
 * `superadmin` queda fuera del selector: reasignarlo es una operación
 * sensible que no se expone en este formulario básico.
 */
export const usuarioRolAsignableEnum = z.enum(["admin", "gerente_sede", "entrenador", "jugador"]);

export const editUsuarioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  telefono: z.string().trim().max(30, "Máximo 30 caracteres").optional().or(z.literal("")),
  rol: usuarioRolAsignableEnum,
});

export type EditUsuarioValues = z.infer<typeof editUsuarioSchema>;
export type UsuarioRolAsignable = z.infer<typeof usuarioRolAsignableEnum>;
