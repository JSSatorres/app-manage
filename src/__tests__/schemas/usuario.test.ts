import { describe, it, expect } from "vitest";
import { usuarioSchema, createUsuarioSchema, updateUsuarioSchema } from "@/schemas/user.schema";
import { editUsuarioSchema, usuarioRolAsignableEnum } from "@/schemas/usuario.schema";

/**
 * Cobertura de src/schemas/user.schema.ts y src/schemas/usuario.schema.ts (Task 4.2).
 *
 * Nota (sin arreglar, solo reportado): `usuarioSchema`/`createUsuarioSchema`/
 * `updateUsuarioSchema` (user.schema.ts) no se usan en ningún componente ni
 * servicio — src/services/usuarios.service.ts no tiene `createUsuario` (solo
 * `updateUsuario`, `updateUsuarioRol`, `deleteUsuario`) y el único form real
 * (`UsuarioForm.tsx`) usa `editUsuarioSchema` (usuario.schema.ts). Parecen
 * schemas huérfanos de un modelo anterior; se testean tal cual (forma propia
 * autoconsistente), no contra un servicio que ya no existe.
 */

const USUARIO_ID = "11111111-1111-4111-8111-111111111111";
const SEDE_ID = "22222222-2222-4222-8222-222222222222";

describe("usuarioSchema (user.schema.ts)", () => {
  const validInput = {
    id: USUARIO_ID,
    email: "coach@example.com",
    nombre: "Ana López",
    rol: "Entrenador",
    sede_id: SEDE_ID,
    telefono: "600111222",
    foto_perfil: "https://example.com/foto.jpg",
    created_at: "2026-07-12T10:00:00.000Z",
    updated_at: "2026-07-12T10:00:00.000Z",
  };

  it("acepta una fila completa de usuario", () => {
    expect(usuarioSchema.safeParse(validInput).success).toBe(true);
  });

  it("acepta sede_id nulo", () => {
    expect(usuarioSchema.safeParse({ ...validInput, sede_id: null }).success).toBe(true);
  });

  it("rechaza email inválido", () => {
    const result = usuarioSchema.safeParse({ ...validInput, email: "no-es-email" });
    expect(result.success).toBe(false);
  });

  it("rechaza nombre demasiado corto (mín. 2 caracteres)", () => {
    const result = usuarioSchema.safeParse({ ...validInput, nombre: "A" });
    expect(result.success).toBe(false);
  });

  it("rechaza sede_id que no es uuid", () => {
    const result = usuarioSchema.safeParse({ ...validInput, sede_id: "no-es-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("createUsuarioSchema (user.schema.ts)", () => {
  const validInput = {
    email: "nuevo@example.com",
    nombre: "Carlos Ruiz",
    rol: "AdminSede" as const,
    sede_id: SEDE_ID,
    telefono: "600333444",
  };

  it("acepta la forma completa con un rol del enum", () => {
    expect(createUsuarioSchema.safeParse(validInput).success).toBe(true);
  });

  it("rechaza si falta el email", () => {
    const withoutEmail = { nombre: validInput.nombre, rol: validInput.rol, sede_id: validInput.sede_id };
    expect(createUsuarioSchema.safeParse(withoutEmail).success).toBe(false);
  });

  it("rechaza rol fuera del enum (SuperAdmin/AdminSede/Entrenador/Jugador)", () => {
    const result = createUsuarioSchema.safeParse({ ...validInput, rol: "Invitado" });
    expect(result.success).toBe(false);
  });

  it("rechaza email con formato inválido", () => {
    const result = createUsuarioSchema.safeParse({ ...validInput, email: "no-es-email" });
    expect(result.success).toBe(false);
  });
});

describe("updateUsuarioSchema (user.schema.ts) · partial de createUsuarioSchema", () => {
  it("acepta objeto vacío (todo opcional)", () => {
    expect(updateUsuarioSchema.safeParse({}).success).toBe(true);
  });

  it("acepta solo el nombre", () => {
    expect(updateUsuarioSchema.safeParse({ nombre: "Nuevo Nombre" }).success).toBe(true);
  });

  it("rechaza rol fuera del enum cuando se envía", () => {
    const result = updateUsuarioSchema.safeParse({ rol: "Invitado" });
    expect(result.success).toBe(false);
  });
});

describe("editUsuarioSchema (usuario.schema.ts) · el que usa UsuarioForm en producción", () => {
  const validInput = {
    nombre: "Marta Gómez",
    telefono: "600555666",
    rol: "entrenador" as const,
  };

  it("acepta la forma que envía UsuarioForm (nombre, telefono, rol)", () => {
    expect(editUsuarioSchema.safeParse(validInput).success).toBe(true);
  });

  it("acepta telefono vacío (opcional o cadena vacía)", () => {
    expect(editUsuarioSchema.safeParse({ ...validInput, telefono: "" }).success).toBe(true);
  });

  it("rechaza si falta el nombre", () => {
    const withoutNombre = { telefono: validInput.telefono, rol: validInput.rol };
    expect(editUsuarioSchema.safeParse(withoutNombre).success).toBe(false);
  });

  it("rechaza nombre demasiado corto (mín. 2 caracteres)", () => {
    const result = editUsuarioSchema.safeParse({ ...validInput, nombre: "A" });
    expect(result.success).toBe(false);
  });

  it("rechaza rol fuera del enum asignable (admin/gerente_sede/entrenador/jugador)", () => {
    const result = editUsuarioSchema.safeParse({ ...validInput, rol: "superadmin" });
    expect(result.success).toBe(false);
  });

  it("rechaza telefono demasiado largo (máx. 30 caracteres)", () => {
    const result = editUsuarioSchema.safeParse({ ...validInput, telefono: "6".repeat(31) });
    expect(result.success).toBe(false);
  });

  it("usuarioRolAsignableEnum no incluye superadmin (operación sensible fuera del selector)", () => {
    expect(usuarioRolAsignableEnum.safeParse("superadmin").success).toBe(false);
    expect(usuarioRolAsignableEnum.safeParse("admin").success).toBe(true);
  });
});
