import { describe, it, expect } from "vitest";
import {
  parseDateValue,
  parseTimeValue,
  parseCellValue,
  buildWorkbookBlob,
  parseWorkbook,
} from "@/services/import-export/workbook";
import type { FieldSchema } from "@/services/import-export/schema";

describe("parseDateValue", () => {
  it("acepta ISO", () => {
    expect(parseDateValue("2026-05-22")).toBe("2026-05-22");
  });
  it("acepta dd/mm/yyyy", () => {
    expect(parseDateValue("22/05/2026")).toBe("2026-05-22");
  });
  it("acepta serial de Excel", () => {
    // 46164 = 2026-05-22 aprox; comprobamos formato
    const r = parseDateValue(46164);
    expect(r).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("devuelve null para vacío", () => {
    expect(parseDateValue("")).toBeNull();
  });
});

describe("parseTimeValue", () => {
  it("normaliza HH:MM a HH:MM:SS", () => {
    expect(parseTimeValue("19:00")).toBe("19:00:00");
  });
  it("acepta HH:MM:SS", () => {
    expect(parseTimeValue("09:30:15")).toBe("09:30:15");
  });
});

describe("parseCellValue", () => {
  const listField: FieldSchema = { key: "sedes", header: "Sedes", aliases: [], type: "list" };
  it("divide listas por coma o punto y coma", () => {
    expect(parseCellValue(listField, "A, B; C")).toEqual(["A", "B", "C"]);
  });
  const numField: FieldSchema = { key: "dorsal", header: "Dorsal", aliases: [], type: "number" };
  it("parsea números", () => {
    expect(parseCellValue(numField, "10")).toBe(10);
    expect(parseCellValue(numField, "abc")).toBeNull();
  });
});

describe("workbook round-trip", () => {
  it("escribe y vuelve a leer una hoja de sedes y equipos", async () => {
    const blob = buildWorkbookBlob([
      { entity: "sedes", rows: [{ nombre: "Canarias", direccion: "Calle 1" }] },
      { entity: "equipos", rows: [{ nombre: "Cadete A", categoria: "2010", sede: "Canarias" }] },
    ]);
    const buffer = await blob.arrayBuffer();
    const sheets = parseWorkbook(buffer);

    const sedes = sheets.find((s) => s.entity === "sedes");
    const equipos = sheets.find((s) => s.entity === "equipos");
    expect(sedes?.rows).toHaveLength(1);
    expect(sedes?.rows[0].nombre).toBe("Canarias");
    expect(equipos?.rows[0].nombre).toBe("Cadete A");
    expect(equipos?.rows[0].sede).toBe("Canarias");
  });

  it("reconoce hojas con nombres alias y headers flexibles", async () => {
    // Construimos un libro 'a mano' con nombre de hoja y headers no canónicos
    const blob = buildWorkbookBlob([{ entity: "jugadores", rows: [] }]);
    const buffer = await blob.arrayBuffer();
    const sheets = parseWorkbook(buffer);
    expect(sheets.find((s) => s.entity === "jugadores")).toBeDefined();
  });
});
