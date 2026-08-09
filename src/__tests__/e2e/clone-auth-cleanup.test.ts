import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadEnvConfig: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@next/env", () => ({ loadEnvConfig: mocks.loadEnvConfig }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const mockedFs = {
    ...actual,
    mkdir: vi.fn(),
    readFile: mocks.readFile,
    unlink: mocks.unlink,
    writeFile: vi.fn(),
  };

  return {
    ...mockedFs,
    default: mockedFs,
  };
});
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import { cleanupStoredCloneFixture } from "../../../e2e/support/clone-auth";

const context = {
  cleanupPrefix: "E2E clon R5 run-id",
  managerWorkspaceId: "workspace-id",
  ownsSourceSede: false,
  sourceSedeId: "legacy-sede-id",
  sourceSedeName: "Sede legado",
};

function configureAuthenticatedClient(from = vi.fn()) {
  const query = {
    data: [],
    error: null,
    delete: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
  };
  query.delete.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);
  if (!from.getMockImplementation()) {
    from.mockReturnValue(query);
  }
  mocks.createClient.mockReturnValue({
    auth: { signInWithPassword: vi.fn().mockResolvedValue({ data: { session: {}, user: {} }, error: null }) },
    from,
  });
  return from;
}

describe("cleanup almacenado de la fixture E2E de clonacion", () => {
  const originalEnvironment = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnvironment,
      E2E_CLONE_CONTEXT_PATH: "D:/temp/clone-context.json",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      TEST_USER_EMAIL: "test@dev.local",
      TEST_USER_PASSWORD: "password",
    };
    mocks.readFile.mockResolvedValue(JSON.stringify(context));
    mocks.unlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnvironment;
  });

  it("no hace nada cuando no hay contexto almacenado", async () => {
    delete process.env.E2E_CLONE_CONTEXT_PATH;

    await expect(cleanupStoredCloneFixture()).resolves.toBeUndefined();

    expect(mocks.readFile).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("elimina el contexto solo despues de limpiar la fixture", async () => {
    configureAuthenticatedClient();

    await cleanupStoredCloneFixture();

    expect(mocks.loadEnvConfig).toHaveBeenCalledWith(process.cwd());
    expect(mocks.unlink).toHaveBeenCalledWith("D:/temp/clone-context.json");
  });

  it("conserva el contexto y sanea el error si falla la limpieza", async () => {
    mocks.readFile.mockResolvedValue(
      JSON.stringify({
        ...context,
        sourceSessionId: "00000000-0000-4000-8000-000000000005",
        sourceTrainerId: "00000000-0000-4000-8000-000000000006",
        sourceTeamId: "00000000-0000-4000-8000-000000000007",
      }),
    );
    configureAuthenticatedClient(vi.fn(() => { throw new Error("token=secret-token"); }));

    await expect(cleanupStoredCloneFixture()).rejects.toThrow(
      "Clone E2E stored fixture cleanup failed: [redacted-token]",
    );
    await expect(cleanupStoredCloneFixture()).rejects.not.toThrow("secret-token");

    expect(mocks.unlink).not.toHaveBeenCalled();
  });

  it("no elimina una sede legado que no pertenece a la fixture", async () => {
    const from = configureAuthenticatedClient();

    await cleanupStoredCloneFixture();

    expect(from).not.toHaveBeenCalledWith("sedes");
  });
});
