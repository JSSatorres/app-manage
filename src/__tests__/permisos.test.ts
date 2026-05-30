import { describe, it, expect } from "vitest";
import {
  can,
  tieneAccesoAlPanel,
  normalizeRol,
  type Rol,
  type Recurso,
} from "@/lib/permisos";

describe("permisos · can()", () => {
  it("superadmin puede ver y mutar todo", () => {
    const recursos: Recurso[] = [
      "dashboard", "sedes", "equipos", "entrenadores", "jugadores",
      "ejercicios", "sesiones", "documentos", "usuarios", "parametros", "configuracion",
    ];
    for (const r of recursos) {
      expect(can("superadmin", r, "view")).toBe(true);
      expect(can("superadmin", r, "mutate")).toBe(true);
    }
  });

  it("admin (dueño de club) gestiona todo el club", () => {
    expect(can("admin", "usuarios", "mutate")).toBe(true);
    expect(can("admin", "parametros", "mutate")).toBe(true);
    expect(can("admin", "configuracion", "view")).toBe(true);
    expect(can("admin", "sedes", "mutate")).toBe(true);
  });

  it("gerente_sede gestiona su sede pero no usuarios/parámetros/configuración", () => {
    expect(can("gerente_sede", "equipos", "mutate")).toBe(true);
    expect(can("gerente_sede", "jugadores", "mutate")).toBe(true);
    expect(can("gerente_sede", "sedes", "view")).toBe(true);
    // No gestiona usuarios ni accede a configuración/parámetros
    expect(can("gerente_sede", "usuarios", "mutate")).toBe(false);
    expect(can("gerente_sede", "parametros", "view")).toBe(false);
    expect(can("gerente_sede", "configuracion", "view")).toBe(false);
  });

  it("entrenador: ve gestión, muta jugadores/ejercicios/sesiones, no equipos/entrenadores/usuarios", () => {
    expect(can("entrenador", "jugadores", "mutate")).toBe(true);
    expect(can("entrenador", "ejercicios", "mutate")).toBe(true);
    expect(can("entrenador", "sesiones", "mutate")).toBe(true);
    expect(can("entrenador", "equipos", "view")).toBe(true);
    expect(can("entrenador", "equipos", "mutate")).toBe(false);
    expect(can("entrenador", "entrenadores", "mutate")).toBe(false);
    expect(can("entrenador", "usuarios", "view")).toBe(false);
    expect(can("entrenador", "sedes", "view")).toBe(false);
    expect(can("entrenador", "configuracion", "view")).toBe(false);
  });

  it("jugador no tiene ningún permiso de gestión", () => {
    const recursos: Recurso[] = [
      "dashboard", "sedes", "equipos", "entrenadores", "jugadores",
      "ejercicios", "sesiones", "documentos", "usuarios", "parametros", "configuracion",
    ];
    for (const r of recursos) {
      expect(can("jugador", r, "view")).toBe(false);
      expect(can("jugador", r, "mutate")).toBe(false);
    }
  });

  it("rol nulo nunca tiene permiso", () => {
    expect(can(null, "dashboard", "view")).toBe(false);
    expect(can(undefined, "equipos", "mutate")).toBe(false);
  });
});

describe("permisos · tieneAccesoAlPanel()", () => {
  it("todos los roles de gestión acceden al panel", () => {
    const conAcceso: Rol[] = ["superadmin", "admin", "gerente_sede", "entrenador"];
    for (const r of conAcceso) expect(tieneAccesoAlPanel(r)).toBe(true);
  });

  it("jugador y rol nulo no acceden al panel", () => {
    expect(tieneAccesoAlPanel("jugador")).toBe(false);
    expect(tieneAccesoAlPanel(null)).toBe(false);
  });
});

describe("permisos · normalizeRol()", () => {
  it("acepta los roles canónicos", () => {
    expect(normalizeRol("admin")).toBe("admin");
    expect(normalizeRol("gerente_sede")).toBe("gerente_sede");
  });

  it("rechaza valores desconocidos o legacy", () => {
    expect(normalizeRol("AdminSede")).toBeNull();
    expect(normalizeRol("viewer")).toBeNull();
    expect(normalizeRol(null)).toBeNull();
    expect(normalizeRol(undefined)).toBeNull();
  });
});
