import { describe, it, expect } from "vitest";
import { extractGoogleId, buildGoogleExportUrl } from "@/services/import-export/source";

describe("extractGoogleId", () => {
  it("extrae el id de una URL de Google Sheets", () => {
    const url = "https://docs.google.com/spreadsheets/d/1AbC_dEfG-123/edit#gid=0";
    expect(extractGoogleId(url)).toEqual({ id: "1AbC_dEfG-123", kind: "sheet" });
  });

  it("extrae el id de un enlace /file/d/ de Drive", () => {
    const url = "https://drive.google.com/file/d/9XyZ_987/view?usp=sharing";
    expect(extractGoogleId(url)).toEqual({ id: "9XyZ_987", kind: "drive" });
  });

  it("extrae el id de un enlace open?id= de Drive", () => {
    const url = "https://drive.google.com/open?id=ABC123def";
    expect(extractGoogleId(url)).toEqual({ id: "ABC123def", kind: "drive" });
  });

  it("devuelve null para URLs no reconocidas", () => {
    expect(extractGoogleId("https://example.com/algo")).toBeNull();
  });
});

describe("buildGoogleExportUrl", () => {
  it("construye el endpoint xlsx para un Sheet", () => {
    expect(buildGoogleExportUrl({ id: "ID1", kind: "sheet" })).toBe(
      "https://docs.google.com/spreadsheets/d/ID1/export?format=xlsx",
    );
  });
  it("construye la descarga directa para un archivo de Drive", () => {
    expect(buildGoogleExportUrl({ id: "ID2", kind: "drive" })).toBe(
      "https://drive.google.com/uc?export=download&id=ID2",
    );
  });
});
