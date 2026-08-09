import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import playwrightConfig from "../../../playwright.config";

describe("teardown global de la fixture E2E de clonacion", () => {
  it("registra la limpieza almacenada al finalizar Playwright", () => {
    const teardownSource = readFileSync(resolve(process.cwd(), "e2e/support/clone-global-teardown.ts"), "utf8");

    expect(playwrightConfig.globalTeardown).toBe("./e2e/support/clone-global-teardown.ts");
    expect(teardownSource).toContain('import { cleanupStoredCloneFixture } from "./clone-auth";');
    expect(teardownSource).toContain("await cleanupStoredCloneFixture();");
  });
});
