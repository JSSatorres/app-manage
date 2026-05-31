import { describe, it, expect } from "vitest";
import {
  normalizeHeader,
  buildHeaderMap,
  ENTITY_SCHEMAS,
} from "@/services/import-export/schema";

describe("normalizeHeader", () => {
  it("quita acentos, espacios y mayúsculas", () => {
    expect(normalizeHeader("Fecha de Nacimiento")).toBe("fechadenacimiento");
    expect(normalizeHeader("Categoría")).toBe("categoria");
    expect(normalizeHeader("  TELÉFONO  ")).toBe("telefono");
  });
});

describe("buildHeaderMap", () => {
  it("mapea headers reales a claves canónicas mediante alias", () => {
    const schema = ENTITY_SCHEMAS.jugadores;
    const headers = ["Nombre", "Apellido", "Correo electrónico", "Número", "Pie"];
    const map = buildHeaderMap(schema, headers);
    expect(map.get(0)).toBe("nombre");
    expect(map.get(1)).toBe("apellidos");
    expect(map.get(2)).toBe("email");
    expect(map.get(3)).toBe("dorsal");
    expect(map.get(4)).toBe("pieDominante");
  });

  it("ignora headers desconocidos", () => {
    const schema = ENTITY_SCHEMAS.sedes;
    const map = buildHeaderMap(schema, ["Nombre", "ColumnaRara"]);
    expect(map.get(0)).toBe("nombre");
    expect(map.has(1)).toBe(false);
  });

  it("acepta la propia clave canónica como header", () => {
    const schema = ENTITY_SCHEMAS.equipos;
    const map = buildHeaderMap(schema, ["nombre", "categoria", "sede"]);
    expect([...map.values()].sort()).toEqual(["categoria", "nombre", "sede"]);
  });
});
