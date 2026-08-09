import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createCloneCleanupPrefix,
  formatPostgrestError,
  isOwnedCloneSedeName,
  selectVisibleFixtureParameter,
  selectVisibleSourceSede,
  shouldDeleteSourceSede,
} from "../../../e2e/support/clone-auth";

describe("fixture E2E de clonación de sedes", () => {
  it("does not create or clean up temporary documents", () => {
    const fixtureSource = readFileSync(resolve(process.cwd(), "e2e/support/clone-auth.ts"), "utf8");

    expect(fixtureSource).not.toContain('.from("documentos")');
    expect(fixtureSource).not.toContain('.from("documento_sedes")');
    expect(fixtureSource).not.toContain("sourceDocumentId");
  });

  it("genera un prefijo de ejecución y solo acepta destinos de esa ejecución", () => {
    const prefix = createCloneCleanupPrefix("550e8400-e29b-41d4-a716-446655440000");

    expect(prefix).toBe("E2E clon R5 550e8400-e29b-41d4-a716-446655440000");
    expect(isOwnedCloneSedeName(`${prefix} completa`, prefix)).toBe(true);
    expect(isOwnedCloneSedeName("E2E clon R5 otra-ejecución completa", prefix)).toBe(false);
  });

  it("keeps a legacy source sede out of fixture cleanup", () => {
    expect(shouldDeleteSourceSede({ ownsSourceSede: false })).toBe(false);
    expect(shouldDeleteSourceSede({ ownsSourceSede: true })).toBe(true);
  });

  it("elige la sede visible del workspace de forma determinista aunque el sede_id legado sea externo", () => {
    const legacySourceSedeId = "sede-externa";
    const sourceSede = selectVisibleSourceSede([
      { id: "sede-b", nombre: "Ágora" },
      { id: "sede-c", nombre: "Central" },
      { id: "sede-a", nombre: "Ágora" },
    ]);

    expect(sourceSede).toEqual({ id: "sede-a", nombre: "Ágora" });
    expect(sourceSede?.id).not.toBe(legacySourceSedeId);
    expect(shouldDeleteSourceSede({ ownsSourceSede: false })).toBe(false);
  });

  it("no selecciona una sede cuando el workspace no tiene sedes visibles", () => {
    expect(selectVisibleSourceSede([])).toBeUndefined();
  });

  it("reutiliza un parámetro visible o continúa sin parámetros", () => {
    expect(selectVisibleFixtureParameter([{ id: "parameter-visible" }])).toEqual({ id: "parameter-visible" });
    expect(selectVisibleFixtureParameter([])).toBeUndefined();
  });

  it("redacta datos sensibles al describir errores PostgREST", () => {
    const error = formatPostgrestError({
      code: "42501",
      message: "denied for test@dev.local with token=secret-token",
      details: "Key (workspace_id)=(550e8400-e29b-41d4-a716-446655440000) at https://example.invalid/error",
      hint: "Use Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
      payload: { email: "must-not-appear@dev.local" },
    });

    expect(error).toBe(
      '{"code":"42501","message":"denied for [redacted-email] with [redacted-token]","details":"Key (workspace_id)=([redacted-id]) at [redacted-url]","hint":"Use [redacted-token]"}',
    );
    expect(error).not.toContain("payload");
    expect(error).not.toContain("secret-token");
    expect(error).not.toContain("test@dev.local");
    expect(error).not.toContain("550e8400-e29b-41d4-a716-446655440000");
    expect(error).not.toContain("example.invalid");
  });
});
